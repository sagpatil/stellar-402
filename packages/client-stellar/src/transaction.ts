import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Memo,
  Transaction
} from '@stellar/stellar-sdk';

import { getHorizonServer, getUSDCAsset } from './utils.js';
import { getNetworkConfig } from './config.js';
import type { StellarNetwork } from './types.js';

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

export async function buildPaymentTransaction(
  params: PaymentParams
): Promise<TransactionResult> {
  const { sourceAddress, destinationAddress, amount, memo, network } = params;

  const server = getHorizonServer(network);
  const config = getNetworkConfig(network);
  const usdcAsset = getUSDCAsset(network);

  const sourceAccount = await server.loadAccount(sourceAddress);

  const transactionBuilder = new TransactionBuilder(sourceAccount, {
    fee: (Number.parseInt(BASE_FEE) * 10).toString(),
    networkPassphrase: config.networkPassphrase
  });

  transactionBuilder.addOperation(
    Operation.payment({
      destination: destinationAddress,
      asset: usdcAsset,
      amount: Number.parseFloat(amount).toFixed(7)
    })
  );

  if (memo) {
    transactionBuilder.addMemo(Memo.text(memo));
  }

  transactionBuilder.setTimeout(30);

  const transaction = transactionBuilder.build();

  return {
    transaction,
    xdr: transaction.toXDR()
  };
}

export async function submitTransaction(
  signedXdr: string,
  network: StellarNetwork
): Promise<{ hash: string; successful: boolean; ledger: number }>
{
  const server = getHorizonServer(network);
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    getNetworkConfig(network).networkPassphrase
  ) as Transaction;

  const result = await server.submitTransaction(transaction);

  return {
    hash: result.hash,
    successful: result.successful,
    ledger: result.ledger
  };
}

export async function waitForConfirmation(
  txHash: string,
  network: StellarNetwork,
  maxAttempts = 30,
  delayMs = 1000
): Promise<boolean> {
  const server = getHorizonServer(network);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const transaction = await server.transactions().transaction(txHash).call();
      return transaction.successful;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

export async function getTransactionDetails(
  txHash: string,
  network: StellarNetwork
) {
  const server = getHorizonServer(network);
  return server.transactions().transaction(txHash).call();
}

