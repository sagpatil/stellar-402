import { useEffect, useMemo, useState } from 'react';

import {
  buildPaymentTransaction,
  createStellarPaymentPayload,
  encodeStellarPaymentHeader,
  formatAmount,
  getUSDCBalance,
  type StellarNetwork,
  type StellarPaymentRequirement
} from '@stellar-x402/client-stellar';
import { Networks } from '@stellar/stellar-sdk';

import { useStellarWalletKit } from '../hooks/useStellarWalletKit.js';

export interface StellarPaywallProps {
  requirement: StellarPaymentRequirement;
  onPaymentPrepared: (header: string) => Promise<void>;
  onError?: (error: Error) => void;
}

type PaymentStatus =
  | 'idle'
  | 'checking-balance'
  | 'building-tx'
  | 'signing'
  | 'submitting'
  | 'success'
  | 'error';

export function StellarPaywall({ requirement, onPaymentPrepared, onError }: StellarPaywallProps) {
  const clientNetwork = useMemo(() => toClientNetwork(requirement.network), [requirement.network]);
  const wallet = useStellarWalletKit({ network: clientNetwork });

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentAmount = useMemo(() => stroopsToDecimal(requirement.maxAmountRequired), [requirement.maxAmountRequired]);
  const assetCode = useMemo(() => resolveAssetCode(requirement.asset), [requirement.asset]);
  const memoHint = requirement.extra?.memoHint;
  const networkPassphrase = requirement.extra?.networkPassphrase ?? (clientNetwork === 'testnet' ? Networks.TESTNET : Networks.PUBLIC);

  useEffect(() => {
    if (!wallet.connected || !wallet.address) {
      return;
    }

    const run = async () => {
      setStatus('checking-balance');
      setError(null);

      const result = await getUSDCBalance(wallet.address!, clientNetwork);

      if (result.error) {
        setStatus('error');
        setError(`Account error: ${result.error}`);
        return;
      }

      if (!result.hasTrustline) {
        setStatus('error');
        setError(`Your account needs a ${assetCode} trustline`);
        return;
      }

      setBalance(result.balance);

      if (Number.parseFloat(result.balance) < Number.parseFloat(paymentAmount)) {
        setStatus('error');
        setError(
          `Insufficient balance. Available ${formatAmount(result.balance)} ${assetCode}, require ${formatAmount(paymentAmount)} ${assetCode}`
        );
        return;
      }

      setStatus('idle');
    };

    run().catch((err) => {
      const message = err instanceof Error ? err.message : 'Balance check failed';
      setError(message);
      setStatus('error');
    });
  }, [wallet.connected, wallet.address, clientNetwork, paymentAmount, assetCode]);

  const handlePay = async () => {
    if (!wallet.address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setStatus('building-tx');
      setError(null);

      const transaction = await buildPaymentTransaction({
        sourceAddress: wallet.address,
        destinationAddress: requirement.payTo,
        amount: paymentAmount,
        memo: memoHint,
        network: clientNetwork
      });

      setStatus('signing');
      const signedXdr = await wallet.signTransaction(transaction.xdr);

      const payload = createStellarPaymentPayload({
        requirement,
        signedTransactionXdr: signedXdr,
        networkPassphrase,
        memo: memoHint,
        metadata: {
          preparedAt: new Date().toISOString()
        }
      });

      const header = encodeStellarPaymentHeader(payload);

      setStatus('submitting');
      await onPaymentPrepared(header);
      setStatus('success');
    } catch (error) {
      console.error('Payment failed', error);
      const message = error instanceof Error ? error.message : 'Payment failed';
      setError(message);
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error(message));
    }
  };

  return (
    <div className="stellar-paywall">
      <div className="paywall-header">
        <h2>Payment Required</h2>
        {requirement.description ? <p className="description">{requirement.description}</p> : null}
      </div>

      <div className="payment-details">
        <div className="detail-row">
          <span className="label">Amount</span>
          <span className="value">{formatAmount(paymentAmount)} {assetCode}</span>
        </div>
        <div className="detail-row">
          <span className="label">Network</span>
          <span className="value">{requirement.network}</span>
        </div>
        <div className="detail-row">
          <span className="label">Recipient</span>
          <span className="value" title={requirement.payTo}>{truncate(requirement.payTo)}</span>
        </div>
        {memoHint ? (
          <div className="detail-row">
            <span className="label">Memo Hint</span>
            <span className="value">{memoHint}</span>
          </div>
        ) : null}
      </div>

      {!wallet.initialized && <div className="warning">Initializing wallet kit...</div>}

      {wallet.initialized && !wallet.connected && (
        <div>
          <p className="status-info">Connect your Stellar wallet to continue.</p>
          <button className="wallet-kit-button" onClick={wallet.connect} disabled={wallet.connecting}>
            {wallet.connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
          {wallet.error ? <div className="error-message">{wallet.error}</div> : null}
        </div>
      )}

      {wallet.connected && (
        <div className="wallet-info">
          <div className="connected-badge">
            <span className="dot" />
            <span>Connected</span>
          </div>
          <div className="address">{truncate(wallet.address ?? '')}</div>
          {balance ? <div className="balance">Balance: {formatAmount(balance)} {assetCode}</div> : null}
          <button className="btn btn-secondary btn-sm" onClick={wallet.disconnect}>
            Disconnect
          </button>
        </div>
      )}

      {wallet.connected && status === 'idle' && (
        <button className="btn btn-primary btn-lg" onClick={handlePay}>
          Pay {formatAmount(paymentAmount)} {assetCode}
        </button>
      )}

      {status === 'checking-balance' || status === 'building-tx' || status === 'signing' || status === 'submitting' ? (
        <div className="status-message">
          <div className="spinner" />
          <p>
            {status === 'checking-balance' && 'Checking balance…'}
            {status === 'building-tx' && 'Building transaction…'}
            {status === 'signing' && 'Awaiting wallet signature…'}
            {status === 'submitting' && 'Submitting payment…'}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="error-message">
          <p>{error}</p>
          {status === 'error' ? (
            <button className="btn btn-secondary" onClick={() => setStatus('idle')}>
              Try Again
            </button>
          ) : null}
        </div>
      ) : null}

      {wallet.error ? (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{wallet.error}</p>
        </div>
      ) : null}
    </div>
  );
}

function truncate(value: string, length = 8): string {
  if (!value) {
    return '';
  }
  if (value.length <= length * 2) {
    return value;
  }
  return `${value.slice(0, length)}…${value.slice(-length)}`;
}

function stroopsToDecimal(stroops: string): string {
  const numeric = Number.parseInt(stroops, 10);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid stroop amount provided: ${stroops}`);
  }
  const decimal = numeric / 10_000_000;
  const formatted = decimal.toFixed(7);
  return formatted.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function resolveAssetCode(asset: string | undefined): string {
  if (!asset) {
    return 'USDC';
  }
  const [code] = asset.split(':');
  return code || 'USDC';
}

function toClientNetwork(network: StellarPaymentRequirement['network']): StellarNetwork {
  return network === 'stellar-mainnet' ? 'mainnet' : 'testnet';
}

