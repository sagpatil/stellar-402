/**
 * Core types for StellarX402 - Starting simple
 */

export type StellarNetwork = 'mainnet' | 'testnet';

export interface USDCConfig {
  code: string;
  issuer: string;
}

export interface NetworkConfig {
  horizonUrl: string;
  networkPassphrase: string;
  usdc: USDCConfig;
}

