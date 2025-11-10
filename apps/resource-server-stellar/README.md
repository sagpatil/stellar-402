# Stellar x402 Resource Server (Demo)

Express server showcasing how to gate a resource with the Stellar facilitator middleware.

## Usage

```bash
pnpm --filter @stellar-x402/resource-server-stellar dev
```

Environment variables (optional):

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | HTTP port for the server | `4022` |
| `FACILITATOR_URL` | Base URL for your facilitator | `http://localhost:4021` |
| `PAY_TO` | Destination Stellar account (G...) | demo address |
| `ASSET` | Asset code:issuer | testnet USDC |
| `MAX_AMOUNT_STROOPS` | Amount in stroops | `5000000` |
| `MEMO_HINT` | Memo hint surfaced to clients | `x402-demo-payment` |
| `FEE_SPONSOR` | Fee-paying facilitator public key (G...) | demo sponsor |
| `CORS_ORIGIN` | Comma-separated list of allowed origins | `*` |
| `NETWORK_PASSPHRASE` | Network passphrase | Stellar testnet |

The protected route lives at `/weather/premium`. Without an `X-PAYMENT` header you will receive a `402` with requirements. When invoked with a valid payment header the middleware calls the facilitator `/verify` + `/settle` endpoints, attaches `X-PAYMENT-RESPONSE`, and forwards the request to your handler.

