/**
 * Transaction building and submission
 */
import { Transaction } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types';
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
export declare function buildPaymentTransaction(params: PaymentParams): Promise<TransactionResult>;
/**
 * Submit a signed transaction to the network
 */
export declare function submitTransaction(signedXdr: string, network: StellarNetwork): Promise<{
    hash: string;
    successful: boolean;
    ledger: number;
}>;
/**
 * Wait for transaction confirmation
 */
export declare function waitForConfirmation(txHash: string, network: StellarNetwork, maxAttempts?: number, delayMs?: number): Promise<boolean>;
/**
 * Get transaction details
 */
export declare function getTransactionDetails(txHash: string, network: StellarNetwork): Promise<import("@stellar/stellar-sdk/lib/horizon").ServerApi.TransactionRecord>;
