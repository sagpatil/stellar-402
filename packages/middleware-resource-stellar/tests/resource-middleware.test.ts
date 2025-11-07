import assert from 'node:assert/strict';
import test from 'node:test';

import express, { Request, Response } from 'express';
import request from 'supertest';

import { createStellarPaymentMiddleware } from '../src/index.js';
import type {
  FacilitatorClient,
  FacilitatorPayload,
  PaymentRequirements
} from '../src/types.js';

const requirement: PaymentRequirements = {
  scheme: 'exact',
  network: 'stellar-testnet',
  resource: 'https://api.example.com/protected',
  description: 'Protected resource',
  mimeType: 'application/json',
  maxTimeoutSeconds: 120,
  maxAmountRequired: '5000000',
  payTo: 'GCFXT2DMSGL2H4EIIBQSHE7YPXC74FQOQSLX6HALYZ2VLZVXUV2J7BXD',
  asset: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
};

const requirementProvider = () => requirement;

const noopLogger = {
  info: () => undefined,
  error: () => undefined
};

test('responds with 402 when payment header missing', async () => {
  const facilitator: FacilitatorClient = {
    verify: async () => ({ isValid: true }),
    settle: async () => ({ success: true, txHash: 'abc', networkId: 'stellar-testnet', ledger: 123 })
  };

  const app = express();
  app.use(
    createStellarPaymentMiddleware({
      requirementProvider,
      facilitator,
      logger: noopLogger
    })
  );
  app.get('/resource', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  const response = await request(app).get('/resource');
  assert.equal(response.status, 402);
  assert.equal(response.body.error, 'PAYMENT_REQUIRED');
  assert.deepEqual(response.body.paymentRequirements, requirement);
});

test('cycles through facilitator verify/settle', async () => {
  let verifyCalled = false;
  let settleCalled = false;
  const facilitator: FacilitatorClient = {
    verify: async (payload: FacilitatorPayload) => {
      verifyCalled = true;
      assert.equal(payload.paymentHeader, 'header');
      return { isValid: true };
    },
    settle: async (payload: FacilitatorPayload) => {
      settleCalled = true;
      assert.equal(payload.paymentHeader, 'header');
      return { success: true, txHash: 'abc', networkId: 'stellar-testnet', ledger: 999 };
    }
  };

  const app = express();
  app.use(express.json());
  app.use(
    createStellarPaymentMiddleware({
      requirementProvider,
      facilitator,
      logger: noopLogger
    })
  );
  app.get('/resource', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  const response = await request(app)
    .get('/resource')
    .set('x-payment', 'header');

  assert.equal(response.status, 200);
  assert.equal(verifyCalled, true);
  assert.equal(settleCalled, true);
  assert.equal(response.headers['x-payment-response'] !== undefined, true);
  assert.deepEqual(response.body, { ok: true });
});

test('returns 402 when facilitator verify fails', async () => {
  const facilitator: FacilitatorClient = {
    verify: async () => ({ isValid: false, invalidReason: 'INVALID' }),
    settle: async () => ({ success: true })
  };

  const app = express();
  app.use(
    createStellarPaymentMiddleware({
      requirementProvider,
      facilitator,
      logger: noopLogger
    })
  );

  const response = await request(app)
    .get('/resource')
    .set('x-payment', 'header');

  assert.equal(response.status, 402);
  assert.equal(response.body.invalidReason, 'INVALID');
});

