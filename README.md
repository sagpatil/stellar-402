# StellarX402

> x402 payment protocol implementation for Stellar blockchain

A TypeScript SDK and React demo for building paywalls and micropayments using USDC on Stellar.

## Features

- 💳 **Multi-wallet support** - Freighter, Albedo, xBull, Rabet, and more
- 💰 **USDC payments** - Stablecoin transactions on Stellar testnet
- ⚡ **Low fees** - Stellar's fast and cheap transactions
- 🔒 **Type-safe** - Full TypeScript support
- 🎨 **React components** - Pre-built paywall UI

## Demo

Watch the full paywall flow: [demo.mov](docs/resources/demo.mov)


## Quick Start

```bash
# Install dependencies
npm install

# Run the demo
npm run demo
```

Open http://localhost:3001 to see the paywall demo.

### Verify the `X-PAYMENT` header locally

```bash
npm install          # ensure express dependency is installed
npm run build        # compile sdk into dist/
npm run mock:server  # starts http://localhost:4020

# After paying in the demo, copy the header and replay it against the mock
curl http://localhost:4020/premium-resource \
  -H "X-PAYMENT: <paste-header-here>"
```

The mock server lives at `examples/mock-resource-server.js` and mirrors how a resource server would decode, verify, and respond to the header.

Example response:

```bash
curl http://localhost:4020/premium-resource \
  -H "X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoic3RlbGxhci10ZXN0bmV0IiwicGF5bG9hZCI6eyJ0cmFuc2FjdGlvbkhhc2giOiJmMWMzYWRhMTk4M2VkNGViYTVhYjkyNTkxZDM2ZGMzYmU3ZmFiMTNiNjFhZmE2MTMyMmYwMDM5NDE0NjgxZThjIiwibGVkZ2VyIjoxNDU3ODc1LCJtZW1vIjoieDQwMi1kZW1vLXBheW1lbnQiLCJzdWJtaXR0ZWRBdCI6IjIwMjUtMTEtMDdUMDQ6MzE6MzYuNTUwWiJ9fQ=="
# => {"message":"Payment verified! Enjoy your premium resource.","transaction":{"hash":"f1c3ada1983ed4eba5ab92591d36dc3be7fab13b61afa61322f0039414681e8c","memo":"x402-demo-payment","link":"https://stellar.expert/explorer/testnet/tx/f1c3ada1983ed4eba5ab92591d36dc3be7fab13b61afa61322f0039414681e8c"},"content":{"temperature":"72°F","summary":"Premium weather data payload..."}}
```

## Project Structure

```
stellarx402/
├── sdk/              # Core SDK source
│   ├── types.ts      # TypeScript types
│   ├── config.ts     # Network configs
│   ├── utils.ts      # Helper functions
│   ├── balance.ts    # Balance checking
│   └── transaction.ts # Transaction building
├── demo/             # React demo app
│   ├── components/   # UI components
│   ├── hooks/        # React hooks
│   └── App.tsx       # Main app
└── test/             # Unit tests
```

## Core SDK Usage

```typescript
import { getUSDCBalance, buildPaymentTransaction } from './sdk';

// Check balance
const balance = await getUSDCBalance(address, 'testnet');

// Build payment
const tx = await buildPaymentTransaction({
  sourceAddress: 'G...',
  destinationAddress: 'G...',
  amount: '0.01',
  network: 'testnet',
  memo: 'payment-memo'
});
```

## Demo App

The demo shows a complete payment flow:

1. **Landing page** - Shows locked premium content
2. **Paywall** - Connect wallet and pay 0.01 USDC
3. **Success** - View unlocked content and transaction on Stellar.Expert

### Demo Features

- Self-payment (pay to your own wallet for testing)
- Real Stellar testnet transactions
- Transaction verification on blockchain explorer
- Multi-wallet connection modal

## Getting Test USDC

1. Go to [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Create a testnet account (get XLM)
3. Add USDC trustline:
   - Asset Code: `USDC`
   - Issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
4. Get test USDC from a faucet or friend

## Architecture

### Current Implementation (Phase 1)

✅ Client-side paywall UI  
✅ Wallet connection (Stellar Wallets Kit)  
✅ Transaction building and signing  
✅ Direct submission to Stellar network  

### Future (Phase 2)

- Backend server with 402 middleware
- Facilitator service for fee sponsorship
- Payment verification endpoint
- Session management

#
## Scripts

```bash
npm run build       # Build SDK and demo
npm run demo        # Run demo app (port 3001)
npm run test        # Run unit tests
npm run dev         # Watch mode for development
```

## Tech Stack

- **TypeScript** - Type safety
- **React** - UI framework
- **Vite** - Build tool
- **Stellar SDK** - Blockchain interaction
- **Stellar Wallets Kit** - Multi-wallet support

## Contributing

This is a demo implementation. For production use:

1. Add backend server with 402 middleware
2. Implement facilitator service
3. Add proper error handling
4. Implement session management
5. Add payment verification
6. Deploy to mainnet

## License

Apache-2.0

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [x402 Protocol](https://github.com/coinbase/x402)
- [Stellar Wallets Kit](https://stellarwalletskit.dev/)
- [Stellar.Expert Explorer](https://stellar.expert/)

---

**Note:** This is a testnet demo. All transactions use test USDC and test XLM.
