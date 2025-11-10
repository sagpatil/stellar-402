import { Horizon, Asset, Transaction } from '@stellar/stellar-sdk';
import * as _stellar_stellar_sdk_lib_horizon_server_api_js from '@stellar/stellar-sdk/lib/horizon/server_api.js';

type StellarNetwork = 'mainnet' | 'testnet';
interface USDCConfig {
    code: string;
    issuer: string;
}
interface NetworkConfig {
    horizonUrl: string;
    networkPassphrase: string;
    usdc: USDCConfig;
}

declare const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig>;
declare function getNetworkConfig(network: StellarNetwork): NetworkConfig;

declare function getHorizonServer(network: StellarNetwork): Horizon.Server;
declare function getUSDCAsset(network: StellarNetwork): Asset;
declare function isValidStellarAddress(address: string): boolean;
declare function formatAmount(amount: string): string;

interface BalanceResult {
    balance: string;
    hasTrustline: boolean;
    error?: string;
}
declare function getUSDCBalance(address: string, network: StellarNetwork): Promise<BalanceResult>;
declare function hasUSDCTrustline(address: string, network: StellarNetwork): Promise<boolean>;

interface PaymentParams {
    sourceAddress: string;
    destinationAddress: string;
    amount: string;
    memo?: string;
    network: StellarNetwork;
}
interface TransactionResult {
    transaction: Transaction;
    xdr: string;
}
declare function buildPaymentTransaction(params: PaymentParams): Promise<TransactionResult>;
declare function submitTransaction(signedXdr: string, network: StellarNetwork): Promise<{
    hash: string;
    successful: boolean;
    ledger: number;
}>;
declare function waitForConfirmation(txHash: string, network: StellarNetwork, maxAttempts?: number, delayMs?: number): Promise<boolean>;
declare function getTransactionDetails(txHash: string, network: StellarNetwork): Promise<_stellar_stellar_sdk_lib_horizon_server_api_js.ServerApi.TransactionRecord>;

declare const X402_VERSION = 1;
declare const SUPPORTED_SCHEME: "exact";
type StellarX402Network = 'stellar-mainnet' | 'stellar-testnet';
interface StellarPaymentRequirement {
    scheme: typeof SUPPORTED_SCHEME;
    network: StellarX402Network;
    resource: string;
    description: string;
    mimeType: string;
    maxAmountRequired: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra?: {
        networkPassphrase: string;
        memoHint?: string;
        [key: string]: unknown;
    };
}
interface StellarPaymentPayload {
    x402Version: typeof X402_VERSION;
    scheme: typeof SUPPORTED_SCHEME;
    network: StellarX402Network;
    payload: StellarSignedTransactionPayload;
}
interface StellarSignedTransactionPayload {
    transactionXdr: string;
    networkPassphrase: string;
    signatures?: string[];
    metadata?: {
        memo?: string | null;
        preparedAt?: string;
    };
}
declare function createStellarPaymentPayload(params: {
    requirement: StellarPaymentRequirement;
    signedTransactionXdr: string;
    networkPassphrase: string;
    signatures?: string[];
    memo?: string | null;
    x402Version?: number;
    metadata?: {
        preparedAt?: string;
    };
}): StellarPaymentPayload;
declare function encodeStellarPaymentHeader(payload: StellarPaymentPayload): string;
declare function decodeStellarPaymentHeader(header: string): StellarPaymentPayload;
declare function validateRequirement(requirement: StellarPaymentRequirement): void;
declare function validatePayload(payload: StellarPaymentPayload): void;
declare function describeRequirement(requirement: StellarPaymentRequirement): string;

export { type BalanceResult, NETWORK_CONFIGS, type NetworkConfig, type PaymentParams, type StellarNetwork, type StellarPaymentPayload, type StellarPaymentRequirement, type StellarSignedTransactionPayload, type StellarX402Network, type TransactionResult, type USDCConfig, buildPaymentTransaction, createStellarPaymentPayload, decodeStellarPaymentHeader, describeRequirement, encodeStellarPaymentHeader, formatAmount, getHorizonServer, getNetworkConfig, getTransactionDetails, getUSDCAsset, getUSDCBalance, hasUSDCTrustline, isValidStellarAddress, submitTransaction, validatePayload, validateRequirement, waitForConfirmation };
