# Quick Start Guide

Get the StellarX402 demo running in 5 minutes.

## Prerequisites

- Node.js 18+
- A Stellar wallet (Freighter recommended)
- 5 minutes ⏱️

## Step 1: Install & Run (1 min)

```bash
cd /Users/sagar/code/Stellar/402/Stellarx402-demo
npm install
npm run demo
```

Open http://localhost:3001

## Step 2: Setup Wallet (2 min)

### Install Freighter

1. Go to [freighter.app](https://www.freighter.app/)
2. Install browser extension
3. Create or import wallet
4. **Switch to Testnet** in settings

### Get Test XLM

1. Copy your wallet address
2. Go to [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
3. Paste address and click "Get test network lumens"

### Add USDC Trustline

1. In Freighter, go to "Manage Assets"
2. Click "Add Asset"
3. Enter:
   - Asset Code: `USDC`
   - Issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
4. Confirm

### Get Test USDC

Option 1: Use [Stellar Laboratory](https://laboratory.stellar.org/#txbuilder?network=test)
- Build a payment transaction to yourself from a funded account

Option 2: Ask in [Stellar Discord](https://discord.gg/stellar) for test USDC

## Step 3: Try the Demo (2 min)

1. **Landing Page**
   - Click "🚀 Pay Now to Unlock"

2. **Connect Wallet**
   - Click "Connect Wallet"
   - Select your wallet (Freighter)
   - Approve connection

3. **Make Payment**
   - Review: 0.01 USDC to yourself (self-payment demo)
   - Click "Pay 0.01 USDC"
   - Approve transaction in wallet

4. **Success!**
   - View unlocked content
   - Click "🔍 View on Stellar.Expert" to see your transaction

## Troubleshooting

### "Insufficient balance"
- Make sure you have test USDC (not just XLM)
- Check balance in Freighter

### "op_no_trust" error
- You need to add USDC trustline (see Step 2)

### "Wallet not found"
- Install Freighter extension
- Refresh the page

### Transaction fails
- Ensure you're on **Testnet** (not Mainnet)
- Check you have at least 0.001 XLM for fees

## What's Happening?

1. You click "Pay Now to Unlock"
2. Connect your Stellar wallet
3. Transaction is built: 0.01 USDC from you to you
4. You sign with your wallet
5. Transaction submitted to Stellar testnet
6. Content unlocks on success

## Next Steps

### For Developers

Explore the code:
- `src/` - Core SDK functions
- `demo/components/StellarPaywall.tsx` - Paywall component
- `demo/hooks/useStellarWalletKit.ts` - Wallet connection

### Customize

Edit `demo/App.tsx` to change:
- Payment amount
- Recipient address
- Content description
- UI styling

### Production

To use in production:
1. Switch to mainnet in config
2. Add backend server with 402 middleware
3. Implement facilitator service
4. Add proper error handling
5. Test thoroughly!

## Support

- [Stellar Discord](https://discord.gg/stellar)
- [Stellar Stack Exchange](https://stellar.stackexchange.com/)
- [GitHub Issues](https://github.com/stellar)

---

**Happy building!** 🚀

