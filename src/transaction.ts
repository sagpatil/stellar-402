/**
 * Transaction building and submission
 */

import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Memo,
  Transaction,
} from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types';
import { getHorizonServer, getUSDCAsset } from './utils';
import { getNetworkConfig } from './config';

export interface PaymentParams {
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
  memo?: string;
  network: StellarNetwork;
}

export interface TransactionResult {
  transaction: Transaction;
  xdr: string;
}

/**
 * Build a USDC payment transaction
 */
export async function buildPaymentTransaction(
  params: PaymentParams
): Promise<TransactionResult> {
  const { sourceAddress, destinationAddress, amount, memo, network } = params;

  const server = getHorizonServer(network);
  const config = getNetworkConfig(network);
  const usdcAsset = getUSDCAsset(network);

  // Load source account
  const sourceAccount = await server.loadAccount(sourceAddress);

  // Build transaction with higher fee for testnet reliability
  const transactionBuilder = new TransactionBuilder(sourceAccount, {
    fee: (parseInt(BASE_FEE) * 10).toString(), // 10x base fee for testnet
    networkPassphrase: config.networkPassphrase,
  });

  // Add payment operation
  transactionBuilder.addOperation(
    Operation.payment({
      destination: destinationAddress,
      asset: usdcAsset,
      amount: parseFloat(amount).toFixed(7), // Stellar supports 7 decimal places
    })
  );

  // Add memo if provided
  if (memo) {
    transactionBuilder.addMemo(Memo.text(memo));
  }

  // Set timeout to 30 seconds
  transactionBuilder.setTimeout(30);

  // Build the transaction
  const transaction = transactionBuilder.build();

  return {
    transaction,
    xdr: transaction.toXDR(),
  };
}

/**
 * Submit a signed transaction to the network
 */
export async function submitTransaction(
  signedXdr: string,
  network: StellarNetwork
): Promise<{
  hash: string;
  successful: boolean;
  ledger: number;
}> {
  const server = getHorizonServer(network);
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    getNetworkConfig(network).networkPassphrase
  ) as Transaction;

  const result = await server.submitTransaction(transaction);

  return {
    hash: result.hash,
    successful: result.successful,
    ledger: result.ledger,
  };
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  txHash: string,
  network: StellarNetwork,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<boolean> {
  const server = getHorizonServer(network);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const transaction = await server.transactions().transaction(txHash).call();
      return transaction.successful;
    } catch (error) {
      // Transaction not found yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

/**
 * Get transaction details
 */
export async function getTransactionDetails(
  txHash: string,
  network: StellarNetwork
) {
  const server = getHorizonServer(network);
  return await server.transactions().transaction(txHash).call();
}

