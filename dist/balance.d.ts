/**
 * Balance fetching functionality
 */
import type { StellarNetwork } from './types';
export interface BalanceResult {
    balance: string;
    hasTrustline: boolean;
    error?: string;
}
/**
 * Get USDC balance for a Stellar account
 */
export declare function getUSDCBalance(address: string, network: StellarNetwork): Promise<BalanceResult>;
/**
 * Check if account has USDC trustline
 */
export declare function hasUSDCTrustline(address: string, network: StellarNetwork): Promise<boolean>;
