import assert from 'node:assert/strict';
import { Keypair, Networks, Asset, Operation, TransactionBuilder, Account } from 'stellar-sdk';
import { createVerifier } from '../src/verify.js';
import { createSettlement } from '../src/settle.js';
import { PaymentHeader, PaymentRequirements } from '../src/types.js';
import { type AppConfig } from '../src/config.js';
import { type StellarClients } from '../src/stellar.js';

// This script doubles as a tiny smoke test; it is invoked via
// `pnpm --filter @stellar-x402/facilitator-stellar test` and runs with tsx.
// We keep the assertions lightweight so failures are easy to trace during
// iterative development against Stellar testnet.

// Generate throwaway accounts so we can sign transactions without relying on
// actual key material. The deterministic flow makes assertions simpler.
const sponsor = Keypair.random();
const payer = Keypair.random();
const destination = Keypair.random();

// Minimal facilitator configuration: point at public Stellar testnet endpoints
// and allow only native XLM payments. Fee sponsor secret is randomized for the
// mocked environment but would map to a real key in production.
const baseConfig: AppConfig = {
  PORT: 4021,
  STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
  STELLAR_NETWORK_PASSPHRASE: Networks.TESTNET,
  FEE_SPONSOR_SECRET: sponsor.secret(),
  SUPPORTED_ASSETS: 'XLM',
  supportedAssetsList: ['XLM']
};

// Horizon and Soroban clients are mocked so the test can run offline while
// still exercising the verification/settlement code paths.
const mockClients = (): StellarClients => ({
  horizon: {
    loadAccount: async () => ({ id: destination.publicKey() }),
    submitTransaction: async () => ({
      hash: 'fakehash',
      ledger: 12345,
      _links: {} as any,
      result_xdr: 'result',
      envelope_xdr: 'envelope'
    })
  } as unknown as StellarClients['horizon'],
  soroban: {
    getNetwork: async () => ({ passphrase: Networks.TESTNET })
  } as unknown as StellarClients['soroban']
});

// Helper that builds a valid payment header + requirements pair resembling the
// payload a browser client would send after signing through a wallet.
const buildPaymentHeader = (): { header: PaymentHeader; requirements: PaymentRequirements } => {
  const account = new Account(payer.publicKey(), '1');
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(
      Operation.payment({
        asset: Asset.native(),
        amount: '0.5',
        destination: destination.publicKey()
      })
    )
    .setTimeout(300)
    .build();

  tx.sign(payer);

  const header: PaymentHeader = {
    x402Version: 1,
    scheme: 'exact',
    network: 'stellar-testnet',
    payload: {
      transactionXdr: tx.toXDR(),
      networkPassphrase: Networks.TESTNET,
      signatures: tx.signatures.map((s) => s.signature().toString('base64')),
      metadata: {
        memo: 'test-payment',
        preparedAt: new Date().toISOString()
      }
    }
  };

  const requirements: PaymentRequirements = {
    scheme: 'exact',
    network: 'stellar-testnet',
    resource: 'https://example.com/protected',
    description: 'Test resource',
    mimeType: 'application/json',
    maxTimeoutSeconds: 300,
    maxAmountRequired: '5000000',
    payTo: destination.publicKey(),
    asset: 'XLM',
    extra: {
      networkPassphrase: Networks.TESTNET,
      feeSponsor: sponsor.publicKey()
    }
  };

  return { header, requirements };
};
const run = async () => {
  const { header, requirements } = buildPaymentHeader();
  const clients = mockClients();
  const { verify } = createVerifier({ config: baseConfig, clients });

  // Verify ensures the transaction matches the payment requirements and that
  // the destination account exists; the mocked Horizon client claims success.
  const verification = await verify(header, requirements);

  assert.equal(verification.isValid, true, 'verification should pass for valid payload');
  assert.equal(verification.details?.amount, '0.5');

  // Run settlement against a fresh set of mocked clients so the fee-bump logic
  // exercises submission without relying on shared state.
  const settlementClients = mockClients();
  const { settle } = createSettlement({ config: baseConfig, clients: settlementClients });
  const settlement = await settle(header, requirements);

  assert.equal(settlement.success, true, 'settlement should succeed');
  assert.equal(settlement.txHash, 'fakehash');
  assert.equal(settlement.networkId, 'stellar-testnet');

  console.log('✅ Facilitator verification and settlement smoke tests passed');
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

