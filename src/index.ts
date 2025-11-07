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

