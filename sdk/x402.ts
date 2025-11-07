/**
 * Minimal x402 helpers tailored for Stellar proof-of-concept
 */

import { Buffer } from 'buffer';
import { formatAmount } from './utils';

declare const btoa: (data: string) => string;
declare const atob: (data: string) => string;

// x402 is versioned; keep this constant in one place so callers and validators stay aligned.
const X402_VERSION = 1;
// For the POC we only target the fixed-price "exact" scheme.
const SUPPORTED_SCHEME = 'exact' as const;

export type StellarX402Network = 'stellar-mainnet' | 'stellar-testnet';

/**
 * Shape of the `paymentRequirements` object the resource server returns in a 402 response.
 * Mirrors the Coinbase schema but swaps in Stellar-specific fields (stroops, passphrase, etc.).
 */
export interface StellarPaymentRequirement {
  scheme: typeof SUPPORTED_SCHEME;
  network: StellarX402Network;
  resource: string;
  description: string;
  mimeType: string;
  maxAmountRequired: string; // stroops, stringified integer
  payTo: string; // Stellar account (G...)
  maxTimeoutSeconds: number;
  asset: string; // Example: "XLM" or "USDC:ISSUER"
  extra?: {
    networkPassphrase: string;
    memoHint?: string;
    [key: string]: unknown;
  };
}

/**
 * Minimal settlement proof we care about for the facilitator-free flow.
 * The resource server replays these fields against Horizon to verify payment.
 */
export interface StellarPaymentProof {
  transactionHash: string;
  ledger: number;
  memo?: string | null;
  submittedAt?: string;
}

/**
 * Serialized payload the client drops into the `X-PAYMENT` header.
 */
export interface StellarPaymentPayload {
  x402Version: typeof X402_VERSION;
  scheme: typeof SUPPORTED_SCHEME;
  network: StellarX402Network;
  payload: StellarPaymentProof;
}

// ---------------------------------------------------------------------------
// Payload construction & encoding helpers
// ---------------------------------------------------------------------------

/**
 * Build a strongly-typed payload that satisfies the x402 envelope.
 * Throws if the requirement/proof are malformed so errors pop before encoding.
 */
export function createStellarPaymentPayload(params: {
  requirement: StellarPaymentRequirement;
  proof: StellarPaymentProof;
  x402Version?: number;
}): StellarPaymentPayload {
  const { requirement, proof, x402Version = X402_VERSION } = params;

  validateRequirement(requirement);
  validateProof(proof);

  if (x402Version !== X402_VERSION) {
    throw new Error(`Unsupported x402 version: ${x402Version}`);
  }

  return {
    x402Version: X402_VERSION,
    scheme: SUPPORTED_SCHEME,
    network: requirement.network,
    payload: proof,
  };
}

/**
 * Encode payload as Base64 string for the `X-PAYMENT` request header.
 */
export function encodeStellarPaymentHeader(payload: StellarPaymentPayload): string {
  validatePayload(payload);
  return encodeBase64(JSON.stringify(payload));
}

/**
 * Decode the `X-PAYMENT` header received by the resource server and revalidate.
 */
export function decodeStellarPaymentHeader(header: string): StellarPaymentPayload {
  if (!header || typeof header !== 'string') {
    throw new Error('Invalid X-PAYMENT header value');
  }

  const decoded = decodeBase64(header);

  let data: unknown;
  try {
    data = JSON.parse(decoded);
  } catch (error) {
    throw new Error('X-PAYMENT header is not valid JSON');
  }

  if (!isStellarPaymentPayload(data)) {
    throw new Error('X-PAYMENT payload is not a valid Stellar payload');
  }

  return data;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Basic requirement sanity checks tailored for the POC (scheme/network/payTo/memo/amount).
 */
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

/**
 * Ensure the settlement proof contains a hash/ledger/memo that Horizon can verify.
 */
export function validateProof(proof: StellarPaymentProof): void {
  if (!/^([0-9a-f]{64})$/i.test(proof.transactionHash)) {
    throw new Error('transactionHash must be a 64-character hex string');
  }

  if (!Number.isInteger(proof.ledger) || proof.ledger <= 0) {
    throw new Error('ledger must be a positive integer');
  }

  if (proof.memo && proof.memo.length > 28) {
    throw new Error('memo must be <= 28 characters');
  }
}

/**
 * Composite validator used before encoding/decoding.
 */
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

  validateProof(payload.payload);
}

// ---------------------------------------------------------------------------
// Type guards & generic utilities
// ---------------------------------------------------------------------------

function isSupportedNetwork(network: string): network is StellarX402Network {
  return network === 'stellar-testnet' || network === 'stellar-mainnet';
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
  } catch (error) {
    return false;
  }
}

function encodeBase64(text: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64');
  }

  if (typeof btoa === 'function') {
    return btoa(text);
  }

  throw new Error('Base64 encoding not supported in this environment');
}

function decodeBase64(base64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  if (typeof atob === 'function') {
    return atob(base64);
  }

  throw new Error('Base64 decoding not supported in this environment');
}

/**
 * Human readable helper useful for logging requirement amounts (stroops → display asset).
 */
export function describeRequirement(requirement: StellarPaymentRequirement): string {
  const amountInXlm = (Number(requirement.maxAmountRequired) / 1_000_0000).toString();
  return `${formatAmount(amountInXlm)} ${requirement.asset} → ${requirement.payTo}`;
}

