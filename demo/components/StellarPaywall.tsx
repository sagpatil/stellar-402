/**
 * Stellar Paywall Component
 * Handles wallet connection and payment flow
 */

import React, { useState } from 'react';
import { useStellarWalletKit } from '../hooks/useStellarWalletKit';
import { WalletButton } from './WalletButton';
import {
  getUSDCBalance,
  buildPaymentTransaction,
  formatAmount,
  type StellarNetwork,
  type StellarPaymentRequirement as StellarX402Requirement,
  createStellarPaymentPayload,
  encodeStellarPaymentHeader,
} from '../../sdk/index';
import { TransactionBuilder, Horizon } from '@stellar/stellar-sdk';
import { getNetworkConfig } from '../../sdk/config';

export interface PaymentRequirement {
  network: StellarNetwork;
  recipient: string;
  amount: string;
  memo?: string;
  description?: string;
}

export interface StellarPaywallProps {
  requirement: PaymentRequirement;
  onSuccess?: (txHash: string, paymentHeader?: string) => void;
  onError?: (error: Error) => void;
}

type PaymentStatus = 'idle' | 'checking-balance' | 'building-tx' | 'signing' | 'submitting' | 'success' | 'error';

export function StellarPaywall({ requirement, onSuccess, onError }: StellarPaywallProps) {
  const { initialized, connected, connecting, address, error: walletError, connect, disconnect, signTransaction } = useStellarWalletKit();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Click connect to choose a wallet');
  const [paymentHeader, setPaymentHeader] = useState<string | null>(null);
  
  // For demo: use connected wallet as recipient (self-payment) to avoid trustline issues
  const actualRecipient = address || requirement.recipient;

  const handleStatusChange = (message: string, tone?: 'info' | 'success' | 'error') => {
    setStatusMessage(message);
    if (tone === 'error') {
      setError(message);
    }
  };

  const checkBalance = async () => {
    if (!address) return;

    setStatus('checking-balance');
    setError(null);

    try {
      const result = await getUSDCBalance(address, requirement.network);
      
      if (result.error) {
        setError(`Account error: ${result.error}`);
        setStatus('error');
        return;
      }

      if (!result.hasTrustline) {
        setError('Your account needs to add a USDC trustline first');
        setStatus('error');
        return;
      }

      setBalance(result.balance);
      
      const balanceNum = parseFloat(result.balance);
      const requiredNum = parseFloat(requirement.amount);
      
      if (balanceNum < requiredNum) {
        setError(`Insufficient balance. You have ${formatAmount(result.balance)} USDC but need ${formatAmount(requirement.amount)} USDC`);
        setStatus('error');
        return;
      }

      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check balance');
      setStatus('error');
    }
  };

  const handlePay = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setPaymentHeader(null);
    setTxHash(null);

    try {
      // Step 1: Build transaction
      setStatus('building-tx');
      setError(null);

      const txResult = await buildPaymentTransaction({
        sourceAddress: address,
        destinationAddress: actualRecipient, // Use actualRecipient (self-payment for demo)
        amount: requirement.amount,
        memo: requirement.memo,
        network: requirement.network,
      });

      // Step 2: Sign transaction
      setStatus('signing');
      
      const config = getNetworkConfig(requirement.network);
      const signedXdr = await signTransaction(txResult.xdr);

      // Step 3: Submit to Stellar network
      setStatus('submitting');
      
      const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
      
      // Submit the signed transaction to the Stellar network
      const horizonServer = new Horizon.Server(config.horizonUrl);
      const submitResult = await horizonServer.submitTransaction(tx);
      
      // Get the transaction hash from the result
      const hash = submitResult.hash;

      const ledger = submitResult.ledger ?? 0;
      if (!ledger) {
        throw new Error('Settlement response missing ledger number');
      }
      
      const x402Requirement = toX402Requirement(requirement, actualRecipient);
      const payload = createStellarPaymentPayload({
        requirement: x402Requirement,
        proof: {
          transactionHash: hash,
          ledger,
          memo: requirement.memo,
          submittedAt: new Date().toISOString(),
        },
      });

      const header = encodeStellarPaymentHeader(payload);

      setTxHash(hash);
      setPaymentHeader(header);
      setStatus('success');
      
      if (onSuccess) {
        onSuccess(hash, header);
      }

    } catch (err: any) {
      console.error('Payment error details:', err);
      
      let errorMsg = 'Payment failed';
      
      // Handle Horizon errors
      if (err.response?.data?.extras) {
        const extras = err.response.data.extras;
        if (extras.result_codes) {
          errorMsg = `Transaction failed: ${JSON.stringify(extras.result_codes)}`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setStatus('error');
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMsg));
      }
    }
  };

  // Check balance when wallet connects
  React.useEffect(() => {
    if (connected && address) {
      checkBalance();
    }
  }, [connected, address]);

  return (
    <div className="stellar-paywall">
      <div className="paywall-header">
        <h2>Payment Required</h2>
        {requirement.description && (
          <p className="description">{requirement.description}</p>
        )}
      </div>

      <div className="payment-details">
        <div className="detail-row">
          <span className="label">Amount:</span>
          <span className="value">{formatAmount(requirement.amount)} USDC</span>
        </div>
        <div className="detail-row">
          <span className="label">Network:</span>
          <span className="value">{requirement.network}</span>
        </div>
        <div className="detail-row">
          <span className="label">Recipient:</span>
          <span className="value" title={actualRecipient}>
            {connected && address ? (
              <span style={{ color: '#28a745' }}>
                Your Wallet (Self-Payment Demo)
              </span>
            ) : (
              `${actualRecipient.slice(0, 8)}...${actualRecipient.slice(-8)}`
            )}
          </span>
        </div>
      </div>

          {!initialized && (
            <div className="warning">
              <p>⚠️ Initializing wallet kit...</p>
            </div>
          )}

          {initialized && !connected && (
            <div>
              <p className="status-info">{statusMessage}</p>
              <button 
                onClick={connect}
                disabled={connecting}
                className="connect-button"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          )}

          {connected && (
        <div className="wallet-info">
          <div className="connected-badge">
            <span className="dot"></span>
            <span>Connected</span>
          </div>
          <div className="address">
            {address?.slice(0, 8)}...{address?.slice(-8)}
          </div>
          {balance && (
            <div className="balance">
              Balance: {formatAmount(balance)} USDC
            </div>
          )}
          <button onClick={disconnect} className="btn btn-secondary btn-sm">
            Disconnect
          </button>
        </div>
      )}

      {connected && status === 'idle' && (
        <button 
          onClick={handlePay}
          className="btn btn-primary btn-lg"
        >
          Pay {formatAmount(requirement.amount)} USDC
        </button>
      )}

      {status === 'checking-balance' && (
        <div className="status-message">
          <div className="spinner"></div>
          <p>Checking balance...</p>
        </div>
      )}

      {status === 'building-tx' && (
        <div className="status-message">
          <div className="spinner"></div>
          <p>Building transaction...</p>
        </div>
      )}

      {status === 'signing' && (
        <div className="status-message">
          <div className="spinner"></div>
          <p>Please sign the transaction in Freighter...</p>
        </div>
      )}

      {status === 'submitting' && (
        <div className="status-message">
          <div className="spinner"></div>
          <p>Submitting payment...</p>
        </div>
      )}

      {status === 'success' && txHash && (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Payment Successful!</h3>
          <p className="tx-hash">
            Transaction: {txHash.slice(0, 16)}...
          </p>
          <a 
            href={`https://${requirement.network === 'testnet' ? 'testnet.' : ''}stellarchain.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link"
          >
            View on Explorer →
          </a>
          {paymentHeader && (
            <div className="payment-header">
              <label htmlFor="stellar-x402-header">X-PAYMENT Header</label>
              <textarea
                id="stellar-x402-header"
                value={paymentHeader}
                readOnly
                rows={3}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(paymentHeader).catch(() => {
                      setStatusMessage('Unable to copy header automatically');
                    });
                  } else {
                    setStatusMessage('Clipboard API not available');
                  }
                }}
              >
                Copy Header
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          {status === 'error' && (
            <button onClick={() => setStatus('idle')} className="btn btn-secondary">
              Try Again
            </button>
          )}
        </div>
      )}

      {walletError && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{walletError}</p>
        </div>
      )}
    </div>
  );
}

function toX402Requirement(
  requirement: PaymentRequirement,
  payTo: string
): StellarX402Requirement {
  const config = getNetworkConfig(requirement.network);
  const network = requirement.network === 'testnet' ? 'stellar-testnet' : 'stellar-mainnet';
  const stroops = convertAmountToStroops(requirement.amount);

  return {
    scheme: 'exact',
    network,
    resource: resolveResourceUrl(),
    description: requirement.description ?? 'Stellar x402 resource',
    mimeType: 'application/json',
    maxAmountRequired: stroops,
    payTo,
    maxTimeoutSeconds: 120,
    asset: requirement.network === 'testnet'
      ? `USDC:${config.usdc.issuer}`
      : `USDC:${config.usdc.issuer}`,
    extra: {
      networkPassphrase: config.networkPassphrase,
      memoHint: requirement.memo,
    },
  };
}

function convertAmountToStroops(amount: string): string {
  const numeric = Number.parseFloat(amount);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid amount provided: ${amount}`);
  }

  return Math.round(numeric * 10_000_000).toString();
}

function resolveResourceUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.href;
  }

  return 'https://stellarx402.local/resource';
}

