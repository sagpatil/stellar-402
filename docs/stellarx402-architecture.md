# StellarX402 Architecture & Payment Header Guide

This document explains how the Stellar SDK (`sdk/`) and the React paywall demo (`demo/`) work together, how the custom `x402.ts` helpers fit in, and how to reuse the `X-PAYMENT` header to unlock protected resources.

## High-Level Flow

```
┌────────────┐        ┌────────────────┐        ┌────────────────────┐        ┌─────────────────┐
│ Web Client │ 1. GET │ Resource Server│ 2. 402 │  PaymentRequired   │ 3. Use │ Stellar Wallet  │
│ (Paywall)  │ ─────► │  (402 handler) │ ─────► │  + requirements    │ ─────► │ (sign + submit) │
└────────────┘        └────────────────┘        └────────────────────┘        └─────────────────┘
        │                                                                                  │
        │ 4. Build Stellar tx via SDK (balance.ts, transaction.ts)                         │
        │ 5. Submit tx (wallet returns hash)                                               │
        ▼                                                                                  │
┌────────────────────┐                                                                     │
│ sdk/x402.ts        │ 6. Create + encode X-PAYMENT header                                 │
└────────────────────┘                                                                     │
        │                                                                                  │
        │ 7. Replay original request with X-PAYMENT header                                 │
        ▼                                                                                  ▼
┌────────────┐        ┌────────────────┐                                            ┌────────────────┐
│ Web Client │ ◄──────│ Resource Server│ 8. Decode header, verify hash via Horizon  │ Horizon API    │
│ (Paywall)  │ 9. 200 │  (content)     │ ◄────────────────────────────────────────  │ (transaction)  │
└────────────┘        └────────────────┘                                            └────────────────┘
```

## Folder Overview

```
- sdk/            # TypeScript SDK used by the demo (balance, transaction, x402 helpers)
  ├─ balance.ts
  ├─ transaction.ts
  ├─ config.ts
  ├─ utils.ts
  └─ x402.ts      # Minimal x402 payload + validation helpers (no facilitator required)
- demo/           # React paywall UI consuming the SDK
  ├─ App.tsx      # Coordinates paywall states and displays payment outcome
  ├─ components/
  │   └─ StellarPaywall.tsx  # Calls SDK helpers, renders payment button, shows X-PAYMENT header
  └─ hooks/
      └─ useStellarWalletKit.ts # Wallet connection + signing logic (Freighter, etc.)
- docs/           # Documentation (this file, POC integration guide)
```

## How `sdk/x402.ts` Fits In

`x402.ts` implements just enough of the x402 protocol to let the demo run without a facilitator:

| Step | Function | Purpose |
|------|-----------|---------|
| 1 | `validateRequirement` | Ensures the `paymentRequirements` supplied in 402 responses are well-formed (scheme, network, stroop amount, `payTo`). |
| 2 | `validateProof` | Checks the post-transaction proof (hash format, ledger number, memo length). |
| 3 | `createStellarPaymentPayload` | Combines requirement + proof into the protocol’s JSON envelope. |
| 4 | `encodeStellarPaymentHeader` | Base64-encodes the payload so it can travel in the `X-PAYMENT` request header. |
| 5 | `decodeStellarPaymentHeader` | Lets a resource server decode and revalidate the header when it receives the replayed request. |
| 6 | `describeRequirement` | Generates a human-readable string (useful for logs/UI). |

These helpers are imported by both client and server code. In the demo, they power the post-payment UI and the payload construction. On the server side (outside of this repo), you’d decode the header and double-check the transaction.

## Demo ↔ SDK Interaction

When the user clicks “Pay,” the paywall goes through the following TypeScript flow:

1. **Balance Check**: `sdk/balance.ts` (`getUSDCBalance`) confirms the wallet has enough USDC on Stellar testnet.
2. **Transaction Build**: `sdk/transaction.ts` (`buildPaymentTransaction`) creates an unsigned payment transaction.
3. **Signing & Submit**: `demo/hooks/useStellarWalletKit.ts` prompts the wallet to sign, then submits via Horizon.
4. **Proof Packaging**: once Horizon returns a hash, `sdk/x402.ts` (`createStellarPaymentPayload` + `encodeStellarPaymentHeader`) produces the Base64 header.
5. **UI Display**: `demo/components/StellarPaywall.tsx` renders the header so the user can paste it into a replayed request or share with a resource server.

`demo/App.tsx` receives the payment hash and header via the `onSuccess` callback and stores them in local component state so the success screen can show a copyable value.

## Using the `X-PAYMENT` Header

After a successful payment, the demo shows the encoded header. To use it:

1. Copy the full string (no whitespace changes).
2. Replay the original HTTP request that returned `402 Payment Required`, adding the header. To try this locally, you can spin up the bundled mock server:

   ```bash
   npm install          # install express dependency if needed
   npm run build        # produce dist/ artifacts for the SDK
   npm run mock:server  # starts http://localhost:4020

   curl http://localhost:4020/premium-resource \
     -H "X-PAYMENT: <paste-header-here>"
   ```

3. The resource server should decode the header:

   ```typescript
   import { decodeStellarPaymentHeader } from './sdk/x402';

   const header = req.headers['x-payment'];
   const payload = decodeStellarPaymentHeader(String(header));
   // payload.payload.transactionHash -> look up via Horizon
   ```

4. Verify via Horizon that:
   - The transaction succeeded (`successful === true`).
   - `memo`, `payTo`, and amount match the original `paymentRequirements`.
   - The ledger/timestamp are within `maxTimeoutSeconds`.

5. On success, return `200 OK` with the protected content. Optionally add an `X-PAYMENT-RESPONSE` header echoing the proof back to the client.

## Server-Side Verification Example

See `examples/mock-resource-server.js` for a complete Express implementation that you can run locally—it decodes the header, hits Horizon, and returns a demo JSON payload when verification succeeds.

## Frequently Asked Questions

### Why do we show the header in the UI?
The demo simulates what a client would hand over to the resource server. Surface the header, replay it, and the content unlocks.

### Do I need the full Coinbase x402 packages?
Not for this POC. The custom `x402.ts` covers the happy-path serialization/validation needed for Stellar testnet. You can always swap in the official packages later if you build a facilitator.

### Where do I plug a facilitator in later?
Add a `/verify` and `/settle` middleware on the resource server side. Instead of calling Horizon directly, forward payloads to a facilitator that signs fee-bumps, handles retries, etc.

---

With this flow, new contributors can understand the moving parts quickly: the SDK produces the payment + proof, the demo shows how to consume it, and the header is the handshake that lets a resource server verify payment after the fact.

