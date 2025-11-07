#!/usr/bin/env node
/**
 * Minimal resource server mock to verify X-PAYMENT headers locally.
 *
 * Usage:
 *   npm run build          # Ensure sdk compiled into dist/
 *   npm run mock:server    # Starts server on http://localhost:4020
 *
 * Then replay the header shown in the demo:
 *   curl http://localhost:4020/premium-resource \
 *     -H "X-PAYMENT: <copied-header>"
 */

const express = require('express');
const { decodeStellarPaymentHeader, describeRequirement } = require('../dist/x402');
const { getHorizonServer } = require('../dist/utils');
const { NETWORK_CONFIGS } = require('../dist/config');

const PORT = Number(process.env.PORT ?? 4020);
const REQUIREMENT = {
  scheme: 'exact',
  network: 'stellar-testnet',
  resource: 'http://localhost:4020/premium-resource',
  description: 'Premium weather data (demo)',
  mimeType: 'application/json',
  maxAmountRequired: (0.01 * 1_000_0000).toFixed(0),
  payTo: process.env.DEMO_PAY_TO ?? 'GBVVRXLMNCJQW4HXCYDID4CQQC2SNDMOXGO4QQVZQCVGT6ELJKYUOIRU',
  maxTimeoutSeconds: 300,
  asset: `USDC:${NETWORK_CONFIGS.testnet.usdc.issuer}`,
  extra: {
    networkPassphrase: NETWORK_CONFIGS.testnet.networkPassphrase,
    memoHint: 'x402-demo-payment',
  },
};

const app = express();

app.get('/', (_req, res) => {
  res.json({
    message: 'Stellar x402 mock resource server running',
    requirement: REQUIREMENT,
    requirementDescription: describeRequirement(REQUIREMENT),
    instructions: 'Call GET /premium-resource with the X-PAYMENT header produced by the demo.',
  });
});

app.get('/premium-resource', async (req, res) => {
  const header = req.header('X-PAYMENT');

  if (!header) {
    return sendPaymentRequired(res, 'Missing X-PAYMENT header');
  }

  let payload;
  try {
    payload = decodeStellarPaymentHeader(header);
  } catch (error) {
    return sendPaymentRequired(res, `Invalid header: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (payload.network !== 'stellar-testnet') {
    return sendPaymentRequired(res, 'Unsupported network in payload');
  }

  const txHash = payload.payload.transactionHash;
  const memo = payload.payload.memo;

  try {
    const horizon = getHorizonServer('testnet');
    const tx = await horizon.transactions().transaction(txHash).call();

    if (!tx.successful) {
      return sendPaymentRequired(res, 'Transaction not successful');
    }

    if (tx.memo !== REQUIREMENT.extra.memoHint) {
      return sendPaymentRequired(res, 'Memo mismatch');
    }

    // TODO: extend with payment operation validation if needed.

    res.set(
      'X-PAYMENT-RESPONSE',
      Buffer.from(
        JSON.stringify({ success: true, txHash: tx.hash, ledger: tx.ledger }),
        'utf8'
      ).toString('base64')
    );

    return res.json({
      message: 'Payment verified! Enjoy your premium resource.',
      transaction: {
        hash: tx.hash,
        ledger: tx.ledger,
        memo,
        link: `https://stellar.expert/explorer/testnet/tx/${tx.hash}`,
      },
      content: {
        temperature: '72°F',
        summary: 'Premium weather data payload...',
      },
    });
  } catch (error) {
    console.error('Failed to verify transaction:', error);
    return res.status(503).json({
      error: 'Failed to contact Horizon. Ensure you have network access.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Stellar x402 mock resource server listening on http://localhost:${PORT}`);
  console.log(`Requirement: ${describeRequirement(REQUIREMENT)}`);
});

function sendPaymentRequired(res, message) {
  return res.status(402).json({
    x402Version: 1,
    accepts: [REQUIREMENT],
    error: message ?? null,
  });
}

