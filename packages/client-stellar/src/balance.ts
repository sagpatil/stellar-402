import { getHorizonServer } from './utils.js';
import { getNetworkConfig } from './config.js';
import type { StellarNetwork } from './types.js';

export interface BalanceResult {
  balance: string;
  hasTrustline: boolean;
  error?: string;
}

export async function getUSDCBalance(
  address: string,
  network: StellarNetwork
): Promise<BalanceResult> {
  try {
    const server = getHorizonServer(network);
    const config = getNetworkConfig(network);

    const account = await server.loadAccount(address);

    const usdcBalance = account.balances.find((balance) => {
      if (balance.asset_type === 'native') {
        return false;
      }

      if (!('asset_code' in balance) || !('asset_issuer' in balance)) {
        return false;
      }

      return (
        balance.asset_code === config.usdc.code &&
        balance.asset_issuer === config.usdc.issuer
      );
    });

    if (usdcBalance && 'balance' in usdcBalance) {
      return {
        balance: usdcBalance.balance,
        hasTrustline: true
      };
    }

    return {
      balance: '0',
      hasTrustline: false
    };
  } catch (error) {
    return {
      balance: '0',
      hasTrustline: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function hasUSDCTrustline(
  address: string,
  network: StellarNetwork
): Promise<boolean> {
  const result = await getUSDCBalance(address, network);
  return result.hasTrustline;
}

