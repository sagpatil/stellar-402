/**
 * Network configurations for Stellar
 */
import type { StellarNetwork, NetworkConfig } from './types';
export declare const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig>;
export declare function getNetworkConfig(network: StellarNetwork): NetworkConfig;
