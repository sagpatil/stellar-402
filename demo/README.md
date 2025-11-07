# StellarX402 Demo - Stellar Paywall

A React demo application showcasing the x402 payment protocol on Stellar blockchain.

## Features

- 🔐 **Freighter Wallet Integration** - Connect with Freighter browser extension
- 💰 **USDC Payments** - Pay for content using Stellar USDC
- ⚡ **Real-time Balance Checking** - Verify sufficient funds before payment
- 🎨 **Beautiful UI** - Modern, responsive paywall interface
- ✅ **Payment Confirmation** - On-chain transaction verification
- 🔓 **Content Unlock** - Automatic access after successful payment

## Prerequisites

1. **Freighter Wallet** - Install from [freighter.app](https://www.freighter.app/)
2. **Stellar Testnet Account** - Create at [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
3. **Test USDC** - Add USDC trustline and get test tokens

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/sagar/code/Stellar/402/StellarX402
npm install
```

### 2. Run the Demo

```bash
npm run demo
```

The app will open at `http://localhost:3000`

### 3. Connect Wallet

1. Click "Connect Wallet"
2. Approve connection in Freighter
3. Your balance will be displayed

### 4. Make a Payment

1. Click "Pay 0.01 USDC"
2. Review transaction in Freighter
3. Approve the transaction
4. Content unlocks automatically!

## Project Structure

```
demo/
├── index.html              # Entry HTML
├── main.tsx                # React entry point
├── App.tsx                 # Main app component
├── components/
│   └── StellarPaywall.tsx  # Paywall component
├── hooks/
│   └── useFreighterWallet.ts  # Wallet connection hook
└── styles/
    └── paywall.css         # Styles
```

## How It Works

### 1. Payment Requirement

```typescript
const requirement = {
  network: 'testnet',
  recipient: 'GXXX...', // Merchant address
  amount: '0.01',       // USDC amount
  memo: 'x402-demo',
  description: 'Premium content access'
};
```

### 2. Wallet Connection

```typescript
const wallet = useFreighterWallet();
await wallet.connect(); // Connect to Freighter
```

### 3. Balance Check

```typescript
const balance = await getUSDCBalance(wallet.address, 'testnet');
// Verifies sufficient funds and trustline
```

### 4. Transaction Building

```typescript
const tx = await buildPaymentTransaction({
  sourceAddress: wallet.address,
  destinationAddress: requirement.recipient,
  amount: requirement.amount,
  network: 'testnet'
});
```

### 5. Signing & Submission

```typescript
const signedXdr = await wallet.sign(tx.xdr, networkPassphrase);
// In production: submit through facilitator
```

## Testing on Testnet

### Get Test USDC

1. **Create Account**: https://laboratory.stellar.org/#account-creator?network=test
2. **Add Trustline**:
   - Asset Code: `USDC`
   - Issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
3. **Get Test USDC**: Use a testnet faucet or ask in Stellar Discord

### Demo Payment Flow

1. Request protected content
2. See 402 Payment Required
3. Connect Freighter wallet
4. Check USDC balance
5. Pay 0.01 USDC
6. Sign transaction
7. Content unlocks

## Customization

### Change Payment Amount

Edit `demo/App.tsx`:

```typescript
const requirement: PaymentRequirement = {
  amount: '1.00', // Change amount
  // ...
};
```

### Change Network

```typescript
const requirement: PaymentRequirement = {
  network: 'mainnet', // Use mainnet
  // ...
};
```

### Style Customization

Edit `demo/styles/paywall.css` to customize colors, fonts, and layout.

## Production Deployment

For production use:

1. **Add Facilitator**: Implement `/verify` and `/settle` endpoints
2. **Fee Sponsorship**: Use Fee Bump transactions
3. **Error Handling**: Add retry logic and better error messages
4. **Security**: Validate all transactions server-side
5. **Monitoring**: Track payment success rates

## Troubleshooting

### "Freighter not detected"

- Install Freighter extension
- Refresh the page
- Check browser console for errors

### "Account not found"

- Fund your account on testnet
- Verify you're on the correct network

### "No USDC trustline"

- Add USDC trustline in Stellar Laboratory
- Use correct issuer address

### Transaction fails

- Check you have sufficient USDC balance
- Verify recipient address is correct
- Ensure you have XLM for fees (facilitator handles this in production)

## Next Steps

- [ ] Add Crossmint wallet support
- [ ] Implement facilitator service
- [ ] Add transaction history
- [ ] Support multiple payment options
- [ ] Add subscription payments

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Freighter Wallet](https://www.freighter.app/)
- [x402 Protocol](https://github.com/coinbase/x402)
- [StellarX402 API Docs](../API.md)

## License

Apache-2.0

