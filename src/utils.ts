/**
 * Basic utility functions
 */

import { Asset, Horizon } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types';
import { getNetworkConfig } from './config';

/**
 * Get Horizon server for a network
 */
export function getHorizonServer(network: StellarNetwork): Horizon.Server {
  const config = getNetworkConfig(network);
  return new Horizon.Server(config.horizonUrl);
}

/**
 * Get USDC asset for a network
 */
export function getUSDCAsset(network: StellarNetwork): Asset {
  const config = getNetworkConfig(network);
  return new Asset(config.usdc.code, config.usdc.issuer);
}

/**
 * Validate Stellar address format
 */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address);
}

/**
 * Format amount for display
 */
export function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

