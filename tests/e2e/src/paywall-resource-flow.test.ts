import express from 'express';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createStellarPaymentMiddleware,
  type FacilitatorClient,
  type PaymentRequirements
} from '@stellar-x402/middleware-resource-stellar';

import {
  createStellarPaymentPayload,
  decodeStellarPaymentHeader,
  encodeStellarPaymentHeader,
  type StellarPaymentRequirement
} from '@stellar-x402/client-stellar';

const PAYMENT_REQUIREMENTS: PaymentRequirements = {
  scheme: 'exact',
  network: 'stellar-testnet',
  resource: 'https://api.example.com/weather/premium',
  description: 'Premium weather data',
  mimeType: 'application/json',
  maxTimeoutSeconds: 300,
  maxAmountRequired: '5000000',
  payTo: 'GBICMXO573MQ2FFV63O5Z7ATYV3WEGHWETNS7LSCK62TDXZDMCEBVISQ',
  asset: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  extra: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    memoHint: 'x402-demo-payment',
    feeSponsor: 'GDWW2EP44SZS2TALXKIP4B3IDAFB7JSINECCAKVMRZFORLGERPQCHYFB'
  }
};

const SIGNED_TRANSACTION_XDR = 'AAAAAgAAAABExampleSignedTransactionXDR==';

describe('stellar x402 end-to-end handshake', () => {
  let server: Server;
  let verifyCount = 0;
  let settleCount = 0;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    const facilitator: FacilitatorClient = {
      verify: async (payload) => {
        verifyCount += 1;
        const decoded = decodeStellarPaymentHeader(payload.paymentHeader);
        expect(decoded.payload.transactionXdr).toEqual(SIGNED_TRANSACTION_XDR);
        expect(decoded.payload.metadata?.memo).toEqual('x402-demo-payment');
        return { isValid: true, details: { decoded } };
      },
      settle: async (payload) => {
        settleCount += 1;
        const decoded = decodeStellarPaymentHeader(payload.paymentHeader);
        expect(decoded.payload.transactionXdr).toEqual(SIGNED_TRANSACTION_XDR);
        return {
          success: true,
          txHash: 'abc123hash',
          networkId: payload.paymentRequirements.network,
          ledger: 1234567
        };
      }
    };

    app.use(
      createStellarPaymentMiddleware({
        requirementProvider: () => PAYMENT_REQUIREMENTS,
        facilitator,
        logger: console
      })
    );

    app.get('/weather/premium', (_req, res) => {
      res.json({
        temperature: '72°F',
        conditions: 'Partly Cloudy'
      });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  it('issues 402 challenge for missing payment header', async () => {
    const response = await request(server).get('/weather/premium');
    expect(response.status).toBe(402);
    expect(response.body.error).toBe('PAYMENT_REQUIRED');
    expect(response.body.paymentRequirements.payTo).toBe(PAYMENT_REQUIREMENTS.payTo);
  });

  it('unlocks resource after facilitator verify + settle', async () => {
    const paywallRequirement: StellarPaymentRequirement = {
      ...PAYMENT_REQUIREMENTS,
      description: PAYMENT_REQUIREMENTS.description ?? 'Premium resource'
    };

    const payload = createStellarPaymentPayload({
      requirement: paywallRequirement,
      signedTransactionXdr: SIGNED_TRANSACTION_XDR,
      networkPassphrase: PAYMENT_REQUIREMENTS.extra?.networkPassphrase ?? 'Test SDF Network ; September 2015',
      memo: PAYMENT_REQUIREMENTS.extra?.memoHint,
      metadata: {
        preparedAt: '2024-01-01T00:00:00.000Z'
      }
    });

    const header = encodeStellarPaymentHeader(payload);

    const response = await request(server)
      .get('/weather/premium')
      .set('X-PAYMENT', header);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      temperature: '72°F',
      conditions: 'Partly Cloudy'
    });

    const paymentResponse = response.headers['x-payment-response'];
    expect(paymentResponse).toBeDefined();

    const decodedResponse = JSON.parse(Buffer.from(paymentResponse as string, 'base64').toString('utf8'));
    expect(decodedResponse).toMatchObject({
      success: true,
      txHash: 'abc123hash',
      networkId: 'stellar-testnet'
    });

    expect(verifyCount).toBe(1);
    expect(settleCount).toBe(1);
  });
});

