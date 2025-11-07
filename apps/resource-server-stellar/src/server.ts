import 'dotenv/config';

import express from 'express';
import type { Request } from 'express';
import cors from 'cors';

import {
  createStellarPaymentMiddleware,
  type PaymentRequirements
} from '@stellar-x402/middleware-resource-stellar';

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()).filter(Boolean) ?? '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-PAYMENT'],
    exposedHeaders: ['X-PAYMENT-RESPONSE']
  })
);
app.use(express.json());

const PORT = Number(process.env.PORT ?? 4022);

const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'http://localhost:4021';

app.use(
  createStellarPaymentMiddleware({
    requirementProvider: requirementProvider,
    facilitator: {
      verifyUrl: `${FACILITATOR_URL}/verify`,
      settleUrl: `${FACILITATOR_URL}/settle`
    },
    logger: console
  })
);

app.get('/weather/premium', (_req, res) => {
  res.json({
    temperature: '72°F',
    conditions: 'Partly Cloudy',
    humidity: '65%',
    uvIndex: 6
  });
});

app.listen(PORT, () => {
  console.log(`Resource server listening on http://localhost:${PORT}`);
});

function requirementProvider(_req: Request): PaymentRequirements {
  return {
    scheme: 'exact',
    network: 'stellar-testnet',
    resource: 'https://api.example.com/weather/premium',
    description: 'Premium weather data',
    mimeType: 'application/json',
    maxTimeoutSeconds: 300,
    maxAmountRequired: process.env.MAX_AMOUNT_STROOPS ?? '5000000',
    payTo: process.env.PAY_TO ?? 'GCFXT2DMSGL2H4EIIBQSHE7YPXC74FQOQSLX6HALYZ2VLZVXUV2J7BXD',
    asset: process.env.ASSET ?? 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    extra: {
      networkPassphrase: process.env.NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015',
      memoHint: process.env.MEMO_HINT ?? 'x402-demo-payment',
      feeSponsor: process.env.FEE_SPONSOR ?? 'GDWW2EP44SZS2TALXKIP4B3IDAFB7JSINECCAKVMRZFORLGERPQCHYFB'
    }
  };
}

