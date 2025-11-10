import { Asset, Horizon } from '@stellar/stellar-sdk';

import { getNetworkConfig } from './config.js';
import type { StellarNetwork } from './types.js';

export function getHorizonServer(network: StellarNetwork): Horizon.Server {
  const config = getNetworkConfig(network);
  return new Horizon.Server(config.horizonUrl);
}

export function getUSDCAsset(network: StellarNetwork): Asset {
  const config = getNetworkConfig(network);
  return new Asset(config.usdc.code, config.usdc.issuer);
}

export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address);
}

export function formatAmount(amount: string): string {
  const num = Number.parseFloat(amount);
  if (Number.isNaN(num)) {
    return '0.00';
  }
  return num.toFixed(2);
}

