/**
 * Network configurations for Stellar
 */

import { Networks } from '@stellar/stellar-sdk';
import type { StellarNetwork, NetworkConfig } from './types';

export const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig> = {
  mainnet: {
    horizonUrl: 'https://horizon.stellar.org',
    networkPassphrase: Networks.PUBLIC,
    usdc: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    },
  },
  testnet: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
    usdc: {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    },
  },
};

export function getNetworkConfig(network: StellarNetwork): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

