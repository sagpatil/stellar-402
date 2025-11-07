/**
 * Balance fetching functionality
 */

import type { StellarNetwork } from './types';
import { getHorizonServer, getUSDCAsset } from './utils';
import { getNetworkConfig } from './config';

export interface BalanceResult {
  balance: string;
  hasTrustline: boolean;
  error?: string;
}

/**
 * Get USDC balance for a Stellar account
 */
export async function getUSDCBalance(
  address: string,
  network: StellarNetwork
): Promise<BalanceResult> {
  try {
    const server = getHorizonServer(network);
    const config = getNetworkConfig(network);
    
    // Load account from Stellar network
    const account = await server.loadAccount(address);
    
    // Find USDC balance
    const usdcBalance = account.balances.find(
      (b) =>
        b.asset_type !== 'native' &&
        'asset_code' in b &&
        'asset_issuer' in b &&
        b.asset_code === config.usdc.code &&
        b.asset_issuer === config.usdc.issuer
    );
    
    if (usdcBalance && 'balance' in usdcBalance) {
      return {
        balance: usdcBalance.balance,
        hasTrustline: true,
      };
    }
    
    // Account exists but no USDC trustline
    return {
      balance: '0',
      hasTrustline: false,
    };
  } catch (error) {
    // Account doesn't exist or other error
    return {
      balance: '0',
      hasTrustline: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if account has USDC trustline
 */
export async function hasUSDCTrustline(
  address: string,
  network: StellarNetwork
): Promise<boolean> {
  const result = await getUSDCBalance(address, network);
  return result.hasTrustline;
}

