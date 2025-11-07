/**
 * ClaudeX402 - Stellar x402 Payment Protocol
 * Main exports
 */
export type { StellarNetwork, NetworkConfig, USDCConfig } from './types';
export { NETWORK_CONFIGS, getNetworkConfig } from './config';
export { getHorizonServer, getUSDCAsset, isValidStellarAddress, formatAmount, } from './utils';
export type { BalanceResult } from './balance';
export { getUSDCBalance, hasUSDCTrustline } from './balance';
export type { PaymentParams, TransactionResult } from './transaction';
export { buildPaymentTransaction, submitTransaction, waitForConfirmation, getTransactionDetails, } from './transaction';
