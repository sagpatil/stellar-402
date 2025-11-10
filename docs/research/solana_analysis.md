# Solana x402 Implementation Highlights

## Source References
- PR #283 (Add Solana support)
- PR #542 (Improve Solana paywall wallet connection)
- `specs/schemes/exact/scheme_exact_svm.md`

## Core Flow Summary
1. Client requests protected resource.
2. Server responds with 402 + Solana `paymentRequirements` including `extra.feePayer`.
3. Client builds SPL token transfer transaction, signs locally.
4. Partially-signed transaction base64 encoded in `X-PAYMENT` header.
5. Resource server proxies header + requirements to facilitator `/verify`.
6. Facilitator deserializes transaction, introspects instructions, simulates, confirms fee payer.
7. Upon successful verify, resource server calls facilitator `/settle`.
8. Facilitator adds fee payer signature, optionally rebuilds compute budget instructions, submits to Solana RPC.
9. Resource server unlocks content, returns `X-PAYMENT-RESPONSE` containing tx signature + payer.

## Component Responsibilities
- **Client packages** (`x402-fetch`, `x402-axios`, paywall UI):
  - Discover Solana wallets via wallet-standard packages.
  - Obtain fee payer hint from facilitator `/supported` response.
  - Build and sign versioned Solana transactions (TransferChecked, optional ATA creation).
  - Encode payload for HTTP header.
- **Facilitator service** (Next.js API routes & express example):
  - `/supported`: exposes supported `(scheme, network)` pairs and `feePayer` address.
  - `/verify`: decodes transaction, validates instruction set, ensures token mint, amounts, payTo align with requirements, runs `simulateTransaction`.
  - `/settle`: re-runs verification, signs with fee payer key, submits transaction, polls confirmation.
- **Server middleware / examples**:
  - Express/Hono middleware fetches payment requirements, proxies verification & settlement to facilitator.
  - Bundled example server returns weather API response after settlement.
- **Paywall site**:
  - React/Vite bundle split between EVM and Solana experiences.
  - Connect wallet button invokes wallet-standard modal, handles reconnect, persistent session.
  - On success, triggers `fetch` with `X-PAYMENT` header and conditionally renders unlocked content.

## Key Implementation Details
- Uses Wallet Standard (`@solana/wallet-standard-*`) for reliable wallet detection.
- Facilitator sponsors fees; instructions rely on `ComputeBudget` adjustments for heavy contracts.
- Token transfers rely on `TransferChecked` via Token / Token2022 program, with optional ATA creation if receiver lacks account.
- Network IDs follow Solana numeric IDs (101 mainnet, 102 testnet, 103 devnet); discussion about potential CAIP-2 adoption.
- Additional facilitator hint endpoints were collapsed into richer `/supported` payload per review feedback.
- Example app lives inside Next.js site under `/protected` route with Solana paywall UI.

## Observed Challenges & Solutions
- **Wallet connectivity**: PR #542 refactors paywall to better discover wallets & handle reconnection states.
- **Transaction validity**: robust transaction introspection ensures only intended instructions exist.
- **Fee sponsorship**: facilitator acts as fee payer; client must know fee payer public key up front.
- **Performance**: multiple Solana RPC calls (simulation, blockhash fetch, ATA detection) required; caching recommended.

## Takeaways for Stellar Implementation
- Maintain parity in HTTP flow (`/supported`, `/verify`, `/settle`).
- Provide facilitator hints (fee sponsor, network passphrase analog) in `paymentRequirements.extra`.
- Design client utilities to construct partially signed transactions compatible with common wallets.
- Ensure paywall UX handles wallet discovery, connection, and payment lifecycle with clear status messaging.
