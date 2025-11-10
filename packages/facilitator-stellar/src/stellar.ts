import * as StellarSdk from 'stellar-sdk';
import StellarSoroban from '@stellar/stellar-sdk';
import { PaymentHeader, PaymentRequirements } from './types.js';

type Transaction = StellarSdk.Transaction;
type FeeBumpTransaction = StellarSdk.FeeBumpTransaction;
const { SorobanRpc } = StellarSoroban;
type SorobanServer = InstanceType<typeof SorobanRpc.Server>;

type HorizonServerConstructor = new (serverUrl: string) => {
  submitTransaction: (...args: unknown[]) => Promise<unknown>;
  loadAccount: (...args: unknown[]) => Promise<unknown>;
};

const HorizonCtor = ((StellarSdk as unknown as { Horizon?: { Server?: HorizonServerConstructor } }).Horizon
  ?.Server ?? null) as HorizonServerConstructor | null;

if (!HorizonCtor) {
  throw new Error('StellarSdk.Horizon.Server is not available. Check stellar-sdk version compatibility.');
}

const createHorizonServer = (url: string) => new HorizonCtor(url);

type HorizonServerInstance = InstanceType<HorizonServerConstructor>;
type SubmitTransactionResponse = {
  hash?: string;
  ledger?: number;
  [key: string]: unknown;
};

export interface StellarClients {
  horizon: HorizonServerInstance;
  soroban: SorobanServer;
}

export const createClients = (horizonUrl: string, sorobanUrl: string): StellarClients => ({
  horizon: createHorizonServer(horizonUrl),
  soroban: new SorobanRpc.Server(sorobanUrl)
});

export const decodeTransaction = (payload: PaymentHeader['payload']): Transaction => {
  const envelope = payload.transactionXdr;
  return new StellarSdk.Transaction(envelope, payload.networkPassphrase);
};

export const ensureNetworkPassphrase = (payload: PaymentHeader['payload'], requirements: PaymentRequirements) => {
  if (payload.networkPassphrase !== requirements.extra.networkPassphrase) {
    throw new Error('NETWORK_PASSPHRASE_MISMATCH');
  }
};

export const ensureAssetSupported = (requirements: PaymentRequirements, supportedAssets: string[]) => {
  if (!supportedAssets.includes(requirements.asset)) {
    throw new Error('ASSET_NOT_SUPPORTED');
  }
};

export const ensurePaymentOperation = (tx: Transaction, requirements: PaymentRequirements) => {
  const operations = tx.operations;
  if (operations.length !== 1) {
    throw new Error('UNEXPECTED_OPERATION_COUNT');
  }

  const [operation] = operations;
  if (operation.type !== 'payment') {
    throw new Error('UNSUPPORTED_OPERATION');
  }

  if ('amount' in operation) {
    const operationStroops = amountToStroops(operation.amount as string);
    if (operationStroops !== requirements.maxAmountRequired) {
      throw new Error('AMOUNT_MISMATCH');
    }
  }

  if ('destination' in operation && operation.destination !== requirements.payTo) {
    throw new Error('DESTINATION_MISMATCH');
  }
};

export const stroopsToAmount = (stroops: string): string => {
  const bigIntValue = BigInt(stroops);
  const stroopsPerXlm = BigInt(10_000_000);
  const whole = bigIntValue / stroopsPerXlm;
  const fraction = bigIntValue % stroopsPerXlm;
  const fractionStr = fraction.toString().padStart(7, '0').replace(/0+$/, '');
  return fractionStr.length > 0 ? `${whole.toString()}.${fractionStr}` : whole.toString();
};

export const amountToStroops = (xlm: string): string => {
  const parts = xlm.split('.');
  const whole = BigInt(parts[0]);
  const fraction = parts[1] ?? '0';
  const normalizedFraction = (fraction + '0000000').slice(0, 7);
  const stroopsPerXlm = BigInt(10_000_000);
  const total = whole * stroopsPerXlm + BigInt(normalizedFraction);
  return total.toString();
};

export const buildFeeBump = (
  original: Transaction,
  feeSponsorSecret: string,
  baseFeeMultiplier = 5
): FeeBumpTransaction => {
  const sponsor = StellarSdk.Keypair.fromSecret(feeSponsorSecret);
  const baseFee = (parseInt(original.fee, 10) * baseFeeMultiplier).toString();
  const feeBump = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    sponsor,
    baseFee,
    original,
    original.networkPassphrase
  );
  feeBump.sign(sponsor);
  return feeBump;
};

export const submitTransaction = async (
  clients: StellarClients,
  tx: Transaction | FeeBumpTransaction
): Promise<SubmitTransactionResponse> => {
  const response = await clients.horizon.submitTransaction(tx);
  return response as SubmitTransactionResponse;
};

export const isTestnet = (requirements: PaymentRequirements) => requirements.network === 'stellar-testnet';

