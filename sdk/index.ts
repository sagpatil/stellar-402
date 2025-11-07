/**
 * StellarX402 - Stellar x402 Payment Protocol
 * Main exports
 */

// Types
export type { StellarNetwork, NetworkConfig, USDCConfig } from './types';

// Configuration
export { NETWORK_CONFIGS, getNetworkConfig } from './config';

// Utilities
export {
  getHorizonServer,
  getUSDCAsset,
  isValidStellarAddress,
  formatAmount,
} from './utils';

// Balance operations
export type { BalanceResult } from './balance';
export { getUSDCBalance, hasUSDCTrustline } from './balance';

// Transaction operations
export type { PaymentParams, TransactionResult } from './transaction';
export {
  buildPaymentTransaction,
  submitTransaction,
  waitForConfirmation,
  getTransactionDetails,
} from './transaction';

// x402 helpers
export type {
  StellarPaymentRequirement,
  StellarPaymentPayload,
  StellarPaymentProof,
  StellarX402Network,
} from './x402';
export {
  createStellarPaymentPayload,
  encodeStellarPaymentHeader,
  decodeStellarPaymentHeader,
  validateRequirement,
  validatePayload,
  describeRequirement,
} from './x402';

