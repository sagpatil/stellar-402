/**
 * Tests for Stellar x402 helpers
 */

const assert = require('assert');
const {
  createStellarPaymentPayload,
  encodeStellarPaymentHeader,
  decodeStellarPaymentHeader,
  validateRequirement,
  describeRequirement,
} = require('../dist/x402');

console.log('Testing Stellar x402 helpers...\n');

function buildRequirement() {
  return {
    scheme: 'exact',
    network: 'stellar-testnet',
    resource: 'https://localhost/demo-resource',
    description: 'Premium weather data',
    mimeType: 'application/json',
    maxAmountRequired: '5000000',
    payTo: 'GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR',
    maxTimeoutSeconds: 120,
    asset: 'XLM',
    extra: {
      networkPassphrase: 'Test SDF Network ; September 2015',
      memoHint: 'demo-123',
    },
  };
}

function buildProof() {
  return {
    transactionHash: 'f'.repeat(64),
    ledger: 123456,
    memo: 'demo-123',
    submittedAt: '2025-01-01T00:00:00.000Z',
  };
}

// Test 1: Round-trip encoding
console.log('Test 1: Encode/decode round trip');
try {
  const requirement = buildRequirement();
  validateRequirement(requirement);

  const payload = createStellarPaymentPayload({
    requirement,
    proof: buildProof(),
  });

  const header = encodeStellarPaymentHeader(payload);
  const decoded = decodeStellarPaymentHeader(header);

  assert.strictEqual(decoded.payload.transactionHash, payload.payload.transactionHash);
  assert.strictEqual(decoded.payload.ledger, payload.payload.ledger);
  assert.strictEqual(decoded.payload.memo, payload.payload.memo);
  console.log('✓ Round trip succeeded');
} catch (error) {
  console.error('✗ Round trip test failed:', error.message);
  process.exit(1);
}

// Test 2: Invalid header handling
console.log('Test 2: Invalid header handling');
try {
  let errorCaught = false;
  try {
    decodeStellarPaymentHeader('not-base64');
  } catch (error) {
    errorCaught = true;
  }

  if (!errorCaught) {
    throw new Error('Expected decode to throw an error');
  }

  console.log('✓ Invalid header rejected');
} catch (error) {
  console.error('✗ Invalid header test failed:', error.message);
  process.exit(1);
}

// Test 3: Requirement description helper
console.log('Test 3: Requirement description helper');
try {
  const requirement = buildRequirement();
  const description = describeRequirement(requirement);
  if (!description.includes(requirement.payTo)) {
    throw new Error('Description missing payTo');
  }
  console.log('✓ describeRequirement working');
} catch (error) {
  console.error('✗ describeRequirement test failed:', error.message);
  process.exit(1);
}

console.log('\n✅ All x402 helper tests passed!');

