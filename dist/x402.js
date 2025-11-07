"use strict";
/**
 * Minimal x402 helpers tailored for Stellar proof-of-concept
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStellarPaymentPayload = createStellarPaymentPayload;
exports.encodeStellarPaymentHeader = encodeStellarPaymentHeader;
exports.decodeStellarPaymentHeader = decodeStellarPaymentHeader;
exports.validateRequirement = validateRequirement;
exports.validateProof = validateProof;
exports.validatePayload = validatePayload;
exports.describeRequirement = describeRequirement;
const buffer_1 = require("buffer");
const utils_1 = require("./utils");
// x402 is versioned; keep this constant in one place so callers and validators stay aligned.
const X402_VERSION = 1;
// For the POC we only target the fixed-price "exact" scheme.
const SUPPORTED_SCHEME = 'exact';
// ---------------------------------------------------------------------------
// Payload construction & encoding helpers
// ---------------------------------------------------------------------------
/**
 * Build a strongly-typed payload that satisfies the x402 envelope.
 * Throws if the requirement/proof are malformed so errors pop before encoding.
 */
function createStellarPaymentPayload(params) {
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
function encodeStellarPaymentHeader(payload) {
    validatePayload(payload);
    return encodeBase64(JSON.stringify(payload));
}
/**
 * Decode the `X-PAYMENT` header received by the resource server and revalidate.
 */
function decodeStellarPaymentHeader(header) {
    if (!header || typeof header !== 'string') {
        throw new Error('Invalid X-PAYMENT header value');
    }
    const decoded = decodeBase64(header);
    let data;
    try {
        data = JSON.parse(decoded);
    }
    catch (error) {
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
function validateRequirement(requirement) {
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
function validateProof(proof) {
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
function validatePayload(payload) {
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
function isSupportedNetwork(network) {
    return network === 'stellar-testnet' || network === 'stellar-mainnet';
}
function isStellarPaymentPayload(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value;
    if (candidate.x402Version !== X402_VERSION ||
        candidate.scheme !== SUPPORTED_SCHEME ||
        !candidate.network ||
        typeof candidate.payload !== 'object' ||
        candidate.payload === null) {
        return false;
    }
    try {
        validatePayload(candidate);
        return true;
    }
    catch (error) {
        return false;
    }
}
function encodeBase64(text) {
    if (typeof buffer_1.Buffer !== 'undefined') {
        return buffer_1.Buffer.from(text, 'utf8').toString('base64');
    }
    if (typeof btoa === 'function') {
        return btoa(text);
    }
    throw new Error('Base64 encoding not supported in this environment');
}
function decodeBase64(base64) {
    if (typeof buffer_1.Buffer !== 'undefined') {
        return buffer_1.Buffer.from(base64, 'base64').toString('utf8');
    }
    if (typeof atob === 'function') {
        return atob(base64);
    }
    throw new Error('Base64 decoding not supported in this environment');
}
/**
 * Human readable helper useful for logging requirement amounts (stroops → display asset).
 */
function describeRequirement(requirement) {
    const amountInXlm = (Number(requirement.maxAmountRequired) / 10000000).toString();
    return `${(0, utils_1.formatAmount)(amountInXlm)} ${requirement.asset} → ${requirement.payTo}`;
}
