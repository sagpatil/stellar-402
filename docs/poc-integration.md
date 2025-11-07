## Reusable x402 Client Primitives

- `typescript/packages/x402/src/client/createPaymentHeader.ts` – reference implementation for composing the Base64 `X-PAYMENT` header; we can mirror its serialization logic for Stellar even though the stock version only supports EVM/SVM networks.
- `typescript/packages/x402/src/client/preparePaymentHeader.ts` – illustrates how Coinbase structures unsigned payloads before signing; adapt this pattern when shaping our Stellar payload object.
- `typescript/packages/x402/src/client/selectPaymentRequirements.ts` – contains the helper that picks the correct `(scheme, network)` pair from a 402 response; we can adapt its filtering logic for Stellar-specific requirements.
- `typescript/packages/x402/src/shared/base64.ts` – browser-safe Base64 helpers (`encode`, `decode`) used across the client package; ideal for serializing Stellar transaction payloads without pulling in Node polyfills.
- `typescript/packages/x402/src/shared/json.ts` – strict JSON parsing/stringifying utilities that guard against circular references and ensure canonical payload formatting.
- `typescript/packages/x402/src/types/index.ts` and `.../config.ts` – export the protocol-level TypeScript types for `PaymentRequirements`, `PaymentPayload`, and shared enums so our Stellar definitions stay compatible.
- `typescript/packages/x402/src/paywall/index.ts` – the reference paywall integration that wires `createPaymentHeader` outputs into browser fetches; we can mirror its header injection logic while swapping in Stellar-specific wallet plumbing.

Each of these modules executes entirely on the client, so we can reuse them directly (via the published `x402` package) or cherry-pick the minimal utilities into `Stellarx402_demo` for a facilitator-free proof of concept.

## Facilitator-Free Stellar Flow

1. **Initial request** – The protected endpoint returns `402 Payment Required` with a Stellar-specific `paymentRequirements` object (schema reused from `typescript/packages/x402/src/types/config.ts`). The requirement lists the destination address, stroop-denominated price, network passphrase, and memo hint.
2. **Requirement selection** – In the browser, reuse the filtering logic from `selectPaymentRequirements` to pick the Stellar entry (copy the helper locally so we can extend the network allowlist).
3. **Transaction build** – Call `buildPaymentTransaction` from `sdk/transaction.ts` with the selected requirement data and the payer’s public key gathered from the wallet adapter. This yields an unsigned XDR plus the memo/timebounds we already support.
4. **Header preflight** – Instantiate an unsigned payload object that mirrors `PaymentPayloadSchema`:
   - `transactionXdr`: unsigned envelope from `buildPaymentTransaction`.
   - `networkPassphrase`: copied from requirement extra data.
   - `maxAmount`: mirror `maxAmountRequired` for resource-server sanity checks.
5. **Wallet signing & submission** – Have the wallet sign the transaction (Freighter exposes `signAndSubmitXDR`). For a pure client POC, submit immediately via the wallet’s RPC call or reuse `submitTransaction` if the wallet returns a signed XDR. Capture the resulting `transactionHash`.
6. **Finalize header** – Serialize the payload with the `encode` helper from `x402/shared/base64`, swapping the raw XDR for `{ transactionHash, submittedAt }` once the wallet confirms submission. This produces the Base64 string for the `X-PAYMENT` header.
7. **Replay protected request** – Re-issue the original fetch using the generated `X-PAYMENT` header (see `typescript/packages/x402/src/paywall/index.ts` for an example). Optionally attach an `X-PAYMENT-METADATA` header containing the memo or resource identifier.
8. **Server-side proof** – The resource server receives the header, decodes it via the same x402 helper, and verifies settlement by calling Horizon `GET /transactions/{hash}`. Matching `destination`, `amount`, and `memo` against the original requirement is sufficient for this proof-of-concept.
9. **Unlock content** – When verification passes, respond `200 OK` and include an `X-PAYMENT-RESPONSE` header summarizing `{ success, txHash, ledger }` so the client can display confirmation.

This flow keeps all cryptography and Horizon submission on the client, while the server performs a lightweight confirmation. No facilitator or fee sponsorship is required, making it ideal for a testnet prototype.

## Crafting Stellar `paymentRequirements`

- Start from the shared x402 schema but extend the `network` string to `"stellar-testnet"`. Because `NetworkSchema` currently restricts networks to EVM/SVM, gate this behind a local TypeScript interface that mirrors the schema and cast when invoking `createPaymentHeader`.
- Use `NETWORK_CONFIGS.testnet` for Horizon URL and passphrase. Encode the asset as `"USDC:ISSUER"` (native XLM would simply be `"XLM"`).
- Express `maxAmountRequired` in stroops (multiply XLM amount by `1e7`). Example:

```typescript
import { NETWORK_CONFIGS } from '../sdk/config';

const requirement = {
  scheme: 'exact',
  network: 'stellar-testnet',
  maxAmountRequired: String(5_000_000), // 0.5 XLM in stroops
  resource: 'https://localhost:8787/premium-weather',
  description: 'Premium weather data',
  mimeType: 'application/json',
  payTo: process.env.STELLAR_MERCHANT ?? 'G...DEST',
  maxTimeoutSeconds: 120,
  asset: 'XLM',
  extra: {
    networkPassphrase: NETWORK_CONFIGS.testnet.networkPassphrase,
    memoHint: 'weather-req-42',
  },
};
```

Store this object in your 402 middleware and return it inside the `accepts` array of the `PaymentRequiredResponse`.

## Encoding the `X-PAYMENT` Header

1. After submitting the signed transaction, capture `{ hash, ledger }` from `submitTransaction` or the wallet callback.
2. Build a Stellar-specific payload that still satisfies `PaymentPayloadSchema` but swaps the `payload` field for our custom proof:

```typescript
import { encode } from 'x402/shared';

const paymentPayload = {
  x402Version: 1,
  scheme: 'exact',
  network: 'stellar-testnet',
  payload: {
    transactionHash: hash,
    ledger,
    memo: requirement.extra?.memoHint,
  },
};

const paymentHeader = encode(JSON.stringify(paymentPayload));
```

3. Attach `paymentHeader` as the `X-PAYMENT` request header when retrying the resource fetch. Optionally include the raw signed XDR in a secondary header (`X-PAYMENT-XDR`) if the server wants deeper validation.
4. On the server, decode the header using the same helper and confirm the transaction settled by querying Horizon. Enforce that `memo` (or transaction `source`) ties back to the pending request before unlocking the resource.

These steps reuse the existing demo utilities (`buildPaymentTransaction`, `submitTransaction`, and our configuration helpers) while staying inside the x402 protocol envelope for a lightweight testnet proof of concept.

## Minimal Resource Server Verification

1. **Decode header** – Use `import { decode } from 'x402/shared';` to Base64-decode the `X-PAYMENT` header into a JSON object. Validate presence of `transactionHash`, `ledger`, and `network` (`stellar-testnet`).
2. **Horizon lookup** – Instantiate `getHorizonServer('testnet')` and fetch `GET /transactions/{hash}`. Reject requests if Horizon returns 404 or the transaction is not successful.
3. **Match invariants** – Ensure `tx.memo` (or `memo_text`) equals the memo stored alongside the pending request, `tx.to` matches `paymentRequirements.payTo`, and the amount equals `maxAmountRequired / 1e7`.
4. **Timeout enforcement** – Compare `tx.created_at` to the requirement issuance time and ensure it is within `maxTimeoutSeconds`.
5. **Respond** – When validation passes, return the protected content, setting `X-PAYMENT-RESPONSE` with `{ success: true, txHash: hash, ledger: tx.ledger }`. On failure, re-send `402` with an `error` message describing the mismatch.

Example Express middleware (to live inside `Stellarx402_demo` when we wire the POC):

```typescript
import type { Request, Response, NextFunction } from 'express';
import { decode } from 'x402/shared';
import { getHorizonServer } from '../sdk/utils';

const accepts = [requirement]; // reuse the paymentRequirements object returned in 402 responses

export async function verifyStellarPayment(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['x-payment'];
  if (!header || Array.isArray(header)) {
    return res.status(402).json({ error: 'Missing payment header', accepts });
  }

  const payload = JSON.parse(decode(header));
  if (payload.network !== 'stellar-testnet' || !payload.payload?.transactionHash) {
    return res.status(402).json({ error: 'Invalid Stellar payment payload', accepts });
  }

  const server = getHorizonServer('testnet');
  const tx = await server.transactions().transaction(payload.payload.transactionHash).call();

  if (!tx.successful || tx.to !== accepts[0].payTo) {
    return res.status(402).json({ error: 'Payment not settled', accepts });
  }

  res.setHeader(
    'X-PAYMENT-RESPONSE',
    Buffer.from(
      JSON.stringify({ success: true, txHash: tx.hash, ledger: tx.ledger }),
    ).toString('base64'),
  );

  return next();
}
```

This middleware keeps the proof-of-payment logic compact: decode header, confirm settlement, and surface the same headers the x402 protocol expects, all without a facilitator.

## Optional Enhancements

- **Wallet abstraction** – Build a thin adapter around Freighter and Albedo so the paywall can fall back between providers while reusing the same header serialization routine.
- **SEP-10 session binding** – Perform a Stellar SEP-10 login ahead of payment and embed the session address in the `X-PAYMENT` metadata to prevent header replay.
- **Soroban token support** – Extend the payload schema to cover Soroban contract invocations (include `contractId` and footprint data) once we need non-native assets.
- **Server memo registry** – Persist issued memos/expiration windows in Redis so concurrent purchases can be reconciled without a facilitator.
- **Test harness** – Add Playwright coverage that mocks wallet signing, injects a fake Horizon response, and validates the unlock cycle end-to-end.

