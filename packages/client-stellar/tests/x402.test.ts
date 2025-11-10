import assert from 'node:assert/strict';

import {
  createStellarPaymentPayload,
  encodeStellarPaymentHeader,
  decodeStellarPaymentHeader,
  validateRequirement
} from '../src/x402.js';

const requirement = {
  scheme: 'exact' as const,
  network: 'stellar-testnet' as const,
  resource: 'https://api.example.com/premium',
  description: 'Premium weather data',
  mimeType: 'application/json',
  maxAmountRequired: '5000000',
  payTo: 'GCFXT2DMSGL2H4EIIBQSHE7YPXC74FQOQSLX6HALYZ2VLZVXUV2J7BXD',
  maxTimeoutSeconds: 300,
  asset: 'XLM',
  extra: {
    networkPassphrase: 'Test SDF Network ; September 2015'
  }
};

validateRequirement(requirement);

const signedTransactionXdr = 'AAAAAgAAAABExampleSignedTransactionXDR==';
const payload = createStellarPaymentPayload({
  requirement,
  signedTransactionXdr,
  networkPassphrase: requirement.extra?.networkPassphrase ?? 'Test SDF Network ; September 2015',
  memo: 'x402-demo'
});

assert.equal(payload.x402Version, 1);
assert.equal(payload.scheme, 'exact');
assert.equal(payload.network, requirement.network);
assert.equal(payload.payload.transactionXdr, signedTransactionXdr);
assert.equal(payload.payload.networkPassphrase, requirement.extra?.networkPassphrase ?? 'Test SDF Network ; September 2015');
assert.equal(payload.payload.metadata?.memo, 'x402-demo');

const header = encodeStellarPaymentHeader(payload);
assert.equal(typeof header, 'string');

const decoded = decodeStellarPaymentHeader(header);
assert.equal(decoded.x402Version, payload.x402Version);
assert.equal(decoded.scheme, payload.scheme);
assert.equal(decoded.network, payload.network);
assert.equal(decoded.payload.transactionXdr, payload.payload.transactionXdr);
assert.equal(decoded.payload.networkPassphrase, payload.payload.networkPassphrase);
assert.equal(decoded.payload.metadata?.memo, payload.payload.metadata?.memo);

assert.throws(
  () =>
    createStellarPaymentPayload({
      requirement,
      signedTransactionXdr,
      networkPassphrase: requirement.extra?.networkPassphrase ?? 'Test SDF Network ; September 2015',
      x402Version: 999
    }),
  /Unsupported x402 version/
);

console.log('✅ client-stellar x402 helpers verified');

