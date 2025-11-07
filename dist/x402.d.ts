/**
 * Minimal x402 helpers tailored for Stellar proof-of-concept
 */
declare const X402_VERSION = 1;
declare const SUPPORTED_SCHEME: "exact";
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
/**
 * Build a strongly-typed payload that satisfies the x402 envelope.
 * Throws if the requirement/proof are malformed so errors pop before encoding.
 */
export declare function createStellarPaymentPayload(params: {
    requirement: StellarPaymentRequirement;
    proof: StellarPaymentProof;
    x402Version?: number;
}): StellarPaymentPayload;
/**
 * Encode payload as Base64 string for the `X-PAYMENT` request header.
 */
export declare function encodeStellarPaymentHeader(payload: StellarPaymentPayload): string;
/**
 * Decode the `X-PAYMENT` header received by the resource server and revalidate.
 */
export declare function decodeStellarPaymentHeader(header: string): StellarPaymentPayload;
/**
 * Basic requirement sanity checks tailored for the POC (scheme/network/payTo/memo/amount).
 */
export declare function validateRequirement(requirement: StellarPaymentRequirement): void;
/**
 * Ensure the settlement proof contains a hash/ledger/memo that Horizon can verify.
 */
export declare function validateProof(proof: StellarPaymentProof): void;
/**
 * Composite validator used before encoding/decoding.
 */
export declare function validatePayload(payload: StellarPaymentPayload): void;
/**
 * Human readable helper useful for logging requirement amounts (stroops → display asset).
 */
export declare function describeRequirement(requirement: StellarPaymentRequirement): string;
export {};
