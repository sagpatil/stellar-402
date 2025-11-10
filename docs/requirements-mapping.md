# Stellar x402 Requirements → Implementation Mapping

## Protocol Goals

- **Exact scheme parity**: Client builds partially signed Stellar transactions; facilitator sponsors fees via fee bump; resource server gates responses with `X-PAYMENT` headers.
- **Network coverage**: Initial focus is Stellar testnet. Configuration hooks allow mainnet/Futurenet but are out of scope for MVP.
- **Wallet experience**: Browser paywall mirrors Solana UX with connect → pay → unlock.

## Component Ownership

| Requirement Source | Implementation Location |
| --- | --- |
| Facilitator endpoints (`/supported`, `/verify`, `/settle`) | `packages/facilitator-stellar` |
| Fee sponsorship & settlement | `packages/facilitator-stellar/src/settlement` |
| Stellar `PaymentRequirements` schema | `packages/middleware-resource-stellar/src/schema` |
| Client transaction builder & payload encoder | `packages/client-stellar/src/` |
| Paywall UX parity | `apps/paywall-stellar/` |
| Example facilitator/server/client | `examples/` |
| Tests (unit + integration) | Respective package `tests/` directories |

## Verification Strategy

1. Unit-test transaction builders and schema validators against fixture requirements in stroops.
2. Mock facilitator verification for middleware tests.
3. Run integration harness against Stellar testnet using seeded accounts and Horizon public endpoints.
4. Exercise paywall demo via mocked wallet APIs before hitting real testnet wallets.

## Outstanding Questions

- SEP-10 authentication remains optional; document configuration toggle in facilitator package.
- Soroban token transfer support will ship after native XLM happy path, with simulations mocked in early tests.

