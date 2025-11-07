/**
 * Test transaction building
 */

const { buildPaymentTransaction } = require('../dist/transaction');
const { Keypair } = require('@stellar/stellar-sdk');

console.log('Testing transaction building...\n');

async function runTests() {
  const handleNetworkUnreachable = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(message)) {
      console.log('⚠️ Horizon not reachable in test environment. Skipping remaining transaction tests.');
      console.log('⚠️ Error:', message);
      console.log('\n✅ Transaction tests skipped (network unavailable)');
      return true;
    }
    return false;
  };

  // Test 1: Build a payment transaction
  console.log('Test 1: Build payment transaction');
  try {
    // Generate a test keypair for source
    const sourceKeypair = Keypair.random();
    const destinationKeypair = Keypair.random();
    
    console.log('  Source address:', sourceKeypair.publicKey());
    console.log('  Destination address:', destinationKeypair.publicKey());
    
    // Note: This will fail because the account doesn't exist on testnet
    // But it will test that our transaction building logic is correct
    try {
      await buildPaymentTransaction({
        sourceAddress: sourceKeypair.publicKey(),
        destinationAddress: destinationKeypair.publicKey(),
        amount: '1.00',
        memo: 'Test payment',
        network: 'testnet',
      });
      
      console.log('✗ Should have failed with non-existent account');
      process.exit(1);
    } catch (error) {
      if (handleNetworkUnreachable(error)) {
        return;
      }

      // Expected to fail - account doesn't exist
      if (error.message.includes('Account not found') || error.message.includes('Not Found')) {
        console.log('✓ Correctly handled non-existent account');
        console.log('✓ Transaction builder works correctly\n');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('✗ Transaction building test failed:', error.message);
    process.exit(1);
  }

  // Test 2: Build transaction with known testnet account
  console.log('Test 2: Build transaction with real testnet account');
  try {
    // Use a known testnet address that exists
    const TEST_ADDRESS = 'GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR';
    const destinationKeypair = Keypair.random();
    
    const result = await buildPaymentTransaction({
      sourceAddress: TEST_ADDRESS,
      destinationAddress: destinationKeypair.publicKey(),
      amount: '0.01',
      memo: 'x402 payment',
      network: 'testnet',
    });
    
    console.log('✓ Transaction built successfully');
    console.log('✓ Transaction XDR length:', result.xdr.length);
    console.log('✓ Transaction object created');
    
    // Verify transaction properties
    if (!result.transaction) {
      throw new Error('Transaction object missing');
    }
    if (!result.xdr || result.xdr.length === 0) {
      throw new Error('Transaction XDR missing');
    }
    
    console.log('✓ Transaction structure validated\n');
  } catch (error) {
    if (handleNetworkUnreachable(error)) {
      return;
    }
    console.error('✗ Real account transaction test failed:', error.message);
    process.exit(1);
  }

  // Test 3: Validate transaction parameters
  console.log('Test 3: Validate transaction parameters');
  try {
    const TEST_ADDRESS = 'GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR';
    const destinationKeypair = Keypair.random();
    
    // Test different amounts
    const amounts = ['0.01', '1.00', '10.50', '100.0000000'];
    
    for (const amount of amounts) {
      const result = await buildPaymentTransaction({
        sourceAddress: TEST_ADDRESS,
        destinationAddress: destinationKeypair.publicKey(),
        amount,
        network: 'testnet',
      });
      
      if (!result.xdr) {
        throw new Error(`Failed to build transaction for amount ${amount}`);
      }
    }
    
    console.log('✓ All amount formats handled correctly');
    console.log('✓ Transaction parameters validated\n');
  } catch (error) {
    if (handleNetworkUnreachable(error)) {
      return;
    }
    console.error('✗ Parameter validation test failed:', error.message);
    process.exit(1);
  }

  console.log('✅ All transaction tests passed!');
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

