# x402 → Stellar Component Mapping

## Facilitator
- **Endpoints**: Reuse `/supported`, `/verify`, `/settle` contract.
- **Network Integration**:
  - Connect to Horizon (REST) for classic account queries, sequence numbers.
  - Connect to Soroban RPC (JSON-RPC) for `simulateTransaction`, `getNetwork`, `prepareTransaction`.
- **Verification Workflow**:
  1. Decode Base64 `X-PAYMENT` header into JSON payload.
  2. Parse embedded transaction XDR.
  3. Validate network passphrase and account IDs.
  4. Ensure operations match allowed set:
     - Native XLM: single `Payment` operation with amount == `maxAmountRequired` and destination == `payTo`.
     - Soroban token: `InvokeHostFunction` calling token `transfer` with arguments `(from, to, amount)`.
  5. For Soroban, run simulation to compute `SorobanResources` & check success result.
  6. Verify signatures present for client account; ensure facilitator signature not yet included (to prevent replay of fully signed tx).
  7. Return `VerificationResponse` with failure reason granularity (insufficient balance, unauthorized asset, wrong memo, etc.).
- **Settlement Workflow**:
  1. Re-verify payload (idempotency).
  2. Construct fee sponsorship:
     - Option A: Wrap original tx in `FeeBumpTransaction` signed by facilitator (preferred for Soroban / multi-op).
     - Option B: If transaction already includes facilitator as source for fee, simply sign existing envelope.
  3. Submit to network; poll transaction status until confirmed or timeout.
  4. Return `SettlementResponse` with `txHash`, `networkId`, optional `ledger` or `resultXdr` for debugging.
- **State**: Cache supported `PaymentRequirements` per resource, maintain RPC clients, store secrets (fee payer key, optional SEP-10 verifier keys).

## Client Utilities
- **Discover Requirements**: identical to Solana flow; parse `PaymentRequirements` from 402 response.
- **Wallet Interaction**:
  - Integrate with browser wallets (Freighter, Albedo) using injected APIs or Stellar Wallet Kit.
  - Support SEP-10 handshake when resource requests authentication.
- **Transaction Builder**:
  1. Fetch account sequence via Horizon `GET /accounts/{id}`.
  2. Build base transaction with `timebounds = now..now+maxTimeoutSeconds` and `memo` describing resource.
  3. Add operations:
     - Native XLM `Payment` in stroops converted from `maxAmountRequired`.
     - For Soroban tokens:
       - Use contract ID from `extra.contractId` (or asset issuer) to invoke `transfer`.
       - Call Soroban RPC `prepareTransaction` to embed footprint & authorization entries.
     - Optional `CreateAccount`/`ChangeTrust` operations if requirements specify autop creation (subject to verification policy).
  4. Sign transaction with user wallet; keep fee minimal (e.g., base fee*opCount) to allow facilitator to fee bump.
  5. Produce `StellarPaymentPayload` JSON with fields:
     ```json
     {
       "x402Version": 1,
       "scheme": "exact",
       "network": "stellar",
       "payload": {
         "transactionXdr": "...",
         "networkPassphrase": "...",
         "signatures": ["..."]
       }
     }
     ```
  6. Base64 encode payload for `X-PAYMENT` header.
- **Error Handling**: surface facilitator invalid reasons, guide user to retry (insufficient balance, account not funded, etc.).

## Resource Server Middleware
- **Express/Hono/Next Adapters**: Wrap existing `x402` middleware patterns, customizing requirement generation for Stellar.
- **Payment Requirements**:
  ```json
  {
    "scheme": "exact",
    "network": "stellar",
    "maxAmountRequired": "5000000", // stroops
    "payTo": "G...", 
    "asset": "XLM" or "USDC:GA...",
    "extra": {
      "networkPassphrase": "Test SDF Network ; September 2015",
      "feeSponsor": "G...", // facilitator fee payer
      "sep10Domain": "example.com", // optional
      "contractId": "CB..." // Soroban token
    }
  }
  ```
- **Flow**:
  1. On missing `X-PAYMENT`, respond with 402 & requirements.
  2. On payment attempt, forward header + requirements to facilitator `/verify`.
  3. If valid, call `/settle`, await confirmation.
  4. Append `X-PAYMENT-RESPONSE` header containing Base64 JSON `{ success, txHash, networkId }`.
- **Extensibility**: allow multiple requirements (e.g., native XLM vs Soroban token) and let client choose.

## Paywall UI (Demo Site)
- **UX**: Mirror Solana experience—connect wallet, preview requirements, show progress states.
- **Integration**:
  - Use Wallet Kit or dedicated connectors for Freighter, Albedo, xBull.
  - Display real-time status (awaiting signature, verifying, settling, confirmed).
  - Provide fallback for manual payment (display Stellar address + memo) if wallet unsupported.
- **Post-Payment**: decode `X-PAYMENT-RESPONSE`, show transaction link to Stellar Explorer (e.g., StellarExpert).

## Facilitator Infrastructure
- **Config**: Support environment variables for Horizon/Soroban URLs, fee payer secret, asset allowlist.
- **Monitoring**: Log simulation failures, settlement latency; optionally expose metrics.
- **Security**: Store secrets securely, prevent arbitrary operation execution by strict introspection.

## Parity With Solana Implementation
- Partial signing + facilitator sponsorship.
- Shared API shapes to maintain client compatibility.
- Example weather server & demo site showcasing paywall flow.
