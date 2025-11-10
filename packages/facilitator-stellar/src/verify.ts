import { Horizon } from 'stellar-sdk';
import { PaymentHeader, PaymentRequirements, VerificationResult } from './types.js';
import {
  createClients,
  decodeTransaction,
  ensureAssetSupported,
  ensureNetworkPassphrase,
  ensurePaymentOperation,
  isTestnet,
  stroopsToAmount,
  type StellarClients
} from './stellar.js';
import type { AppConfig } from './config.js';

export interface VerifyDependencies {
  config: AppConfig;
  now?: () => Date;
  clients?: StellarClients;
}

export const createVerifier = ({ config, now = () => new Date(), clients }: VerifyDependencies) => {
  const stellarClients =
    clients ?? createClients(config.STELLAR_HORIZON_URL, config.SOROBAN_RPC_URL);

  const verify = async (
    header: PaymentHeader,
    requirements: PaymentRequirements
  ): Promise<VerificationResult> => {
    try {
      ensureNetworkPassphrase(header.payload, requirements);
      ensureAssetSupported(requirements, config.supportedAssetsList);

      if (!isTestnet(requirements)) {
        return {
          isValid: false,
          invalidReason: 'UNSUPPORTED_NETWORK'
        };
      }

      const tx = decodeTransaction(header.payload);
      ensurePaymentOperation(tx, requirements);

      if (!tx.timeBounds) {
        throw new Error('MISSING_TIMEBOUNDS');
      }

      const currentSeconds = Math.floor(now().getTime() / 1000);
      if (tx.timeBounds?.minTime && Number(tx.timeBounds.minTime) > currentSeconds) {
        throw new Error('TIMEBOUND_TOO_EARLY');
      }

      if (tx.timeBounds?.maxTime && Number(tx.timeBounds.maxTime) < currentSeconds) {
        throw new Error('TIMEBOUND_EXPIRED');
      }

      const maxTimeoutSeconds = requirements.maxTimeoutSeconds;
      if (
        tx.timeBounds.maxTime &&
        Number(tx.timeBounds.maxTime) - currentSeconds > maxTimeoutSeconds
      ) {
        throw new Error('TIMEBOUND_TOO_LONG');
      }

      if (Number(tx.fee) === 0) {
        throw new Error('FEE_TOO_LOW');
      }

      await simulateBalance(stellarClients, requirements.payTo);

      return {
        isValid: true,
        details: {
          amount: stroopsToAmount(requirements.maxAmountRequired)
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          isValid: false,
          invalidReason: error.message
        };
      }
      return {
        isValid: false,
        invalidReason: 'UNKNOWN_ERROR'
      };
    }
  };

  return { verify };
};

const simulateBalance = async (clients: StellarClients, accountId: string) => {
  try {
    await clients.horizon.loadAccount(accountId);
  } catch (error) {
    if (isAccountMissingError(error)) {
      throw new Error('DESTINATION_ACCOUNT_MISSING');
    }
    throw error;
  }
};

type HorizonError = {
  response?: {
    status?: number;
  };
};

function isAccountMissingError(error: unknown): boolean {
  if (error instanceof Error) {
    const horizonError = error as HorizonError;
    if (horizonError.response?.status === 404) {
      return true;
    }

    const { NotFoundError } = Horizon as unknown as {
      NotFoundError?: new (...args: unknown[]) => Error;
    };
    if (NotFoundError && error instanceof NotFoundError) {
      return true;
    }
  }

  return false;
}

