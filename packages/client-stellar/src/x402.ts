import { formatAmount } from './utils.js';

const X402_VERSION = 1;
const SUPPORTED_SCHEME = 'exact' as const;

export type StellarX402Network = 'stellar-mainnet' | 'stellar-testnet';

export interface StellarPaymentRequirement {
  scheme: typeof SUPPORTED_SCHEME;
  network: StellarX402Network;
  resource: string;
  description: string;
  mimeType: string;
  maxAmountRequired: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    networkPassphrase: string;
    memoHint?: string;
    [key: string]: unknown;
  };
}

export interface StellarPaymentPayload {
  x402Version: typeof X402_VERSION;
  scheme: typeof SUPPORTED_SCHEME;
  network: StellarX402Network;
  payload: StellarSignedTransactionPayload;
}

export interface StellarSignedTransactionPayload {
  transactionXdr: string;
  networkPassphrase: string;
  signatures?: string[];
  metadata?: {
    memo?: string | null;
    preparedAt?: string;
  };
}

export function createStellarPaymentPayload(params: {
  requirement: StellarPaymentRequirement;
  signedTransactionXdr: string;
  networkPassphrase: string;
  signatures?: string[];
  memo?: string | null;
  x402Version?: number;
  metadata?: {
    preparedAt?: string;
  };
}): StellarPaymentPayload {
  const {
    requirement,
    signedTransactionXdr,
    networkPassphrase,
    signatures,
    memo,
    x402Version = X402_VERSION,
    metadata
  } = params;

  validateRequirement(requirement);
  validateSignedTransactionPayload({
    transactionXdr: signedTransactionXdr,
    networkPassphrase,
    signatures,
    metadata: {
      memo,
      preparedAt: metadata?.preparedAt
    }
  });

  if (x402Version !== X402_VERSION) {
    throw new Error(`Unsupported x402 version: ${x402Version}`);
  }

  return {
    x402Version: X402_VERSION,
    scheme: SUPPORTED_SCHEME,
    network: requirement.network,
    payload: {
      transactionXdr: signedTransactionXdr,
      networkPassphrase,
      signatures,
      metadata: {
        memo,
        preparedAt: metadata?.preparedAt
      }
    }
  };
}

export function encodeStellarPaymentHeader(payload: StellarPaymentPayload): string {
  validatePayload(payload);
  return encodeBase64(JSON.stringify(payload));
}

export function decodeStellarPaymentHeader(header: string): StellarPaymentPayload {
  if (!header || typeof header !== 'string') {
    throw new Error('Invalid X-PAYMENT header value');
  }

  const decoded = decodeBase64(header);

  let data: unknown;
  try {
    data = JSON.parse(decoded);
  } catch {
    throw new Error('X-PAYMENT header is not valid JSON');
  }

  if (!isStellarPaymentPayload(data)) {
    throw new Error('X-PAYMENT payload is not a valid Stellar payload');
  }

  return data;
}

export function validateRequirement(requirement: StellarPaymentRequirement): void {
  if (requirement.scheme !== SUPPORTED_SCHEME) {
    throw new Error(`Unsupported scheme: ${requirement.scheme}`);
  }

  if (!isSupportedNetwork(requirement.network)) {
    throw new Error(`Unsupported network: ${requirement.network}`);
  }

  if (!/^G[A-Z0-9]{55}$/.test(requirement.payTo)) {
    throw new Error('payTo must be a valid Stellar public key');
  }

  if (!/^[0-9]+$/.test(requirement.maxAmountRequired)) {
    throw new Error('maxAmountRequired must be an integer string (stroops)');
  }

  if (requirement.maxTimeoutSeconds <= 0) {
    throw new Error('maxTimeoutSeconds must be greater than zero');
  }
}

export function validatePayload(payload: StellarPaymentPayload): void {
  if (payload.x402Version !== X402_VERSION) {
    throw new Error(`Unsupported x402 version: ${payload.x402Version}`);
  }

  if (payload.scheme !== SUPPORTED_SCHEME) {
    throw new Error(`Unsupported scheme: ${payload.scheme}`);
  }

  if (!isSupportedNetwork(payload.network)) {
    throw new Error(`Unsupported network: ${payload.network}`);
  }

  validateSignedTransactionPayload(payload.payload);
}

export function describeRequirement(requirement: StellarPaymentRequirement): string {
  const amountInXlm = (Number(requirement.maxAmountRequired) / 1_000_0000).toString();
  return `${formatAmount(amountInXlm)} ${requirement.asset} → ${requirement.payTo}`;
}

function isSupportedNetwork(network: string): network is StellarX402Network {
  return network === 'stellar-testnet' || network === 'stellar-mainnet';
}

function validateSignedTransactionPayload(payload: StellarSignedTransactionPayload): void {
  if (!payload.transactionXdr || typeof payload.transactionXdr !== 'string') {
    throw new Error('transactionXdr must be provided');
  }

  if (!payload.networkPassphrase || typeof payload.networkPassphrase !== 'string') {
    throw new Error('networkPassphrase must be provided');
  }

  if (payload.metadata?.memo && payload.metadata.memo.length > 28) {
    throw new Error('memo must be <= 28 characters');
  }
}

function isStellarPaymentPayload(value: unknown): value is StellarPaymentPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StellarPaymentPayload>;

  if (
    candidate.x402Version !== X402_VERSION ||
    candidate.scheme !== SUPPORTED_SCHEME ||
    !candidate.network ||
    typeof candidate.payload !== 'object' ||
    candidate.payload === null
  ) {
    return false;
  }

  try {
    validatePayload(candidate as StellarPaymentPayload);
    return true;
  } catch {
    return false;
  }
}

function encodeBase64(text: string): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(text, 'utf8').toString('base64');
  }

  if (typeof btoa === 'function') {
    return btoa(text);
  }

  throw new Error('Base64 encoding not supported in this environment');
}

function decodeBase64(base64: string): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(base64, 'base64').toString('utf8');
  }

  if (typeof atob === 'function') {
    return atob(base64);
  }

  throw new Error('Base64 decoding not supported in this environment');
}


