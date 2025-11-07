import { PaymentHeader, PaymentRequirements, SettlementResult } from './types.js';
import {
  buildFeeBump,
  createClients,
  decodeTransaction,
  ensureAssetSupported,
  ensureNetworkPassphrase,
  ensurePaymentOperation,
  submitTransaction,
  type StellarClients
} from './stellar.js';
import type { AppConfig } from './config.js';

export interface SettlementDependencies {
  config: AppConfig;
  clients?: StellarClients;
}

export const createSettlement = ({ config, clients }: SettlementDependencies) => {
  const stellarClients = clients ?? createClients(config.STELLAR_HORIZON_URL, config.SOROBAN_RPC_URL);

  const settle = async (
    header: PaymentHeader,
    requirements: PaymentRequirements
  ): Promise<SettlementResult> => {
    try {
      ensureNetworkPassphrase(header.payload, requirements);
      ensureAssetSupported(requirements, config.supportedAssetsList);

      const tx = decodeTransaction(header.payload);
      ensurePaymentOperation(tx, requirements);

      const feeBump = buildFeeBump(tx, config.FEE_SPONSOR_SECRET);
      const response = await submitTransaction(stellarClients, feeBump);

      return {
        success: true,
        txHash: typeof response.hash === 'string' ? response.hash : undefined,
        networkId: requirements.network,
        ledger: typeof response.ledger === 'number' ? response.ledger : undefined
      };
    } catch (error) {
      console.error('Settlement error:', error);
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message
        };
      }
      return {
        success: false,
        error: 'UNKNOWN_ERROR'
      };
    }
  };

  return { settle };
};

