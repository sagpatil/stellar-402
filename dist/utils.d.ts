/**
 * Basic utility functions
 */
import { Asset, Horizon } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types';
/**
 * Get Horizon server for a network
 */
export declare function getHorizonServer(network: StellarNetwork): Horizon.Server;
/**
 * Get USDC asset for a network
 */
export declare function getUSDCAsset(network: StellarNetwork): Asset;
/**
 * Validate Stellar address format
 */
export declare function isValidStellarAddress(address: string): boolean;
/**
 * Format amount for display
 */
export declare function formatAmount(amount: string): string;
