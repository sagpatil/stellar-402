# Stellar Payment Constraints for x402

## Network & Asset Model
- **Networks**: Stellar mainnet ("Public Global Stellar Network"), testnet ("Test SDF Network ; September 2015"), future Futurenet/Soroban preview ("Test SDF Future Network ; October 2022"). Network selection influences base fees, base reserves, and Horizon RPC endpoints.
- **Assets**: Represented by (code, issuer) pair. Native XLM has implicit issuer and is denominated in stroops (10^-7). Soroban smart-contract tokens follow the [soroban-token-interface], often invoked via host functions.
- **Fee Model**: Base fee currently 100 stroops per operation on mainnet (variable). Transactions must include max fee = base fee * operation count. Fee bumps allow third parties to cover fees post-signing.

## Account & Authorization Primitives
- **SEP-10**: Standard for web auth; challenge transaction signed by client wallet's key. Facilitator can verify signatures by hitting Horizon `/auth` endpoints or verifying XDR locally. Useful for binding HTTP session to on-chain identity.
- **Muxed Accounts**: Support 64-bit ID subaccounts, potentially relevant for custodial flows. Not required for initial design but worth noting for multi-user payTo addresses.
- **Signer Weights**: Accounts may have multiple signers with thresholds; partial signatures must respect thresholds.

## Transaction Construction
- **Envelope**: v1 transactions with up to 100 operations. Soroban requires `InvokeHostFunction` operations wrapped in `SorobanAuthorizedInvocation` metadata.
- **Timebounds**: Required for SEP-10 and best practice for payments; ensures expiry aligning with `maxTimeoutSeconds`.
- **Memo Field**: 28-byte text or 64-bit ID; helpful for linking HTTP request IDs but incompatible with some custodial wallets if overused.
- **Soroban Specifics**:
  - Requires `SorobanResources` (footprint, CPU instructions, memory). Typically obtained via preflight simulation.
  - Clients call `prepareTransaction` via RPC to fetch footprint and include `Auth` entries (signed by invoker) before final submission.
  - Token transfers call `transfer` or `transfer_checked` host functions; may need account creation via `invokeHostFunction` (for contract storage) or classic `CreateAccount`/`Payment` for native asset bridging.

## Fee Sponsorship Strategies
- **Fee Bump Transactions**: External fee payer wraps original transaction using `FeeBumpTransaction` envelope. Facilitator must hold sufficient XLM reserve and sign both fee bump and original envelopes.
- **Soroban Resource Fees**: Combined rent + execution cost; fee bump must set `maxFee` high enough to cover dynamic resource usage discovered during simulation.
- **Muxed Fee Payer**: Optional to differentiate facilitator ledger accounts.

## Verification Capabilities
- **Horizon / RPC**:
  - `simulateTransaction` (Soroban RPC) to fetch expected success result & resource usage.
  - `getFeeStats`, `getNetwork` for dynamic fee estimation.
  - Classic `GET /accounts/{id}` to confirm balances and account existence.
- **Transaction Introspection**: Inspect operations (Payment, PathPaymentStrictSend/Receive, InvokeHostFunction). For compliance, ensure only allowed operation types exist and amounts match `maxAmountRequired` exactly.

## Wallet & Client Considerations
- **Wallet Standards**: Albedo, Freighter, xBull, Rabet support SEP-10 and transaction signing via browser extension/injection. Experimental WalletConnect-like `Stellar Wallet Kit` provides cross-platform popups.
- **Partial Signing**: Wallets can sign transactions lacking fee; some require `maxFee > 0`. For fee sponsorship, either set minimal fee and rely on fee bump or include placeholder `maxFee` and allow facilitator to replace signature if necessary.
- **Soroban Signing**: Requires inclusion of `SorobanAuthorizationEntry` signed by invoker. Wallets like Freighter support automatically; otherwise dApps may provide custom signers.

## Security & Compliance Notes
- Enforce canonical base64 encoding for payloads to avoid whitespace issues.
- Validate issuer allowlist to prevent malicious asset substitution.
- Consider replay protection: transaction hash unique due to timebounds & sequence number, but ensure sequence increment consumed only upon successful settlement.
- Rate limit facilitator endpoints due to higher RPC cost for Soroban simulations.

## Open Questions for Design
- Should facilitator operate Soroban RPC (for simulation) and classic Horizon endpoints? (Likely yes.)
- For fee sponsorship, prefer fee bump or classic `Payment` from facilitator? Fee bump preserves client signature and intent.
- Handling non-native assets: require pre-deployed Soroban token contract vs classic trustline-based assets? (Design should support both, but MVP may target native XLM + verified Soroban USDC.)
- Authentication integration: minimal (signature only) vs optional SEP-10 challenge handshake.
