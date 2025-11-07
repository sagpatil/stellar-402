/**
 * Simple payment example using StellarX402
 * 
 * This demonstrates the basic flow:
 * 1. Check balance
 * 2. Build transaction
 * 3. Sign and submit (requires wallet integration)
 */

const {
  getUSDCBalance,
  buildPaymentTransaction,
  isValidStellarAddress,
  formatAmount,
} = require('../dist/index');

const { Keypair } = require('@stellar/stellar-sdk');

async function demonstratePaymentFlow() {
  console.log('='.repeat(60));
  console.log('StellarX402 - Simple Payment Flow Demo');
  console.log('='.repeat(60) + '\n');

  // Generate test keypairs
  const sourceKeypair = Keypair.random();
  const destinationKeypair = Keypair.random();

  console.log('Step 1: Generate addresses');
  console.log('  Source:', sourceKeypair.publicKey());
  console.log('  Destination:', destinationKeypair.publicKey());
  console.log('  ✓ Addresses generated\n');

  // Validate addresses
  console.log('Step 2: Validate addresses');
  if (!isValidStellarAddress(sourceKeypair.publicKey())) {
    throw new Error('Invalid source address');
  }
  if (!isValidStellarAddress(destinationKeypair.publicKey())) {
    throw new Error('Invalid destination address');
  }
  console.log('  ✓ Addresses validated\n');

  // Check balance (will fail for new addresses)
  console.log('Step 3: Check USDC balance');
  try {
    const balance = await getUSDCBalance(sourceKeypair.publicKey(), 'testnet');
    console.log('  Balance:', formatAmount(balance.balance), 'USDC');
    console.log('  Has trustline:', balance.hasTrustline);
    if (balance.error) {
      console.log('  Note:', balance.error);
    }
    console.log('  ✓ Balance check completed\n');
  } catch (error) {
    console.log('  ✗ Balance check failed:', error.message, '\n');
  }

  // Build transaction (will fail for unfunded addresses)
  console.log('Step 4: Build payment transaction');
  console.log('  Amount: 1.00 USDC');
  console.log('  Memo: "x402 payment"');
  try {
    const result = await buildPaymentTransaction({
      sourceAddress: sourceKeypair.publicKey(),
      destinationAddress: destinationKeypair.publicKey(),
      amount: '1.00',
      memo: 'x402 payment',
      network: 'testnet',
    });
    console.log('  ✓ Transaction built successfully');
    console.log('  XDR length:', result.xdr.length, 'characters\n');
  } catch (error) {
    console.log('  ✗ Transaction building failed:', error.message);
    console.log('  Note: This is expected for unfunded accounts\n');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('Demo Summary');
  console.log('='.repeat(60));
  console.log('✓ Address generation and validation');
  console.log('✓ Balance checking');
  console.log('✓ Transaction building');
  console.log('\nNext steps for production:');
  console.log('1. Fund accounts with XLM (for fees)');
  console.log('2. Add USDC trustline');
  console.log('3. Fund with USDC');
  console.log('4. Integrate wallet (Crossmint, Freighter, etc.)');
  console.log('5. Sign and submit transactions');
  console.log('='.repeat(60) + '\n');
}

// Run the demo
demonstratePaymentFlow().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});

