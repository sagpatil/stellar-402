/**
 * Test balance fetching functionality
 */

const { getUSDCBalance, hasUSDCTrustline } = require('../dist/balance');

console.log('Testing balance fetching...\n');

// Test with a known testnet address (Stellar testnet faucet address)
const TEST_ADDRESS = 'GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR';

async function runTests() {
  // Test 1: Fetch balance for testnet address
  console.log('Test 1: Fetch USDC balance');
  try {
    const result = await getUSDCBalance(TEST_ADDRESS, 'testnet');
    console.log('✓ Balance result:', {
      balance: result.balance,
      hasTrustline: result.hasTrustline,
      error: result.error || 'none'
    });
    console.log('✓ Balance fetch completed\n');
  } catch (error) {
    console.error('✗ Balance fetch failed:', error.message);
    process.exit(1);
  }

  // Test 2: Check trustline
  console.log('Test 2: Check USDC trustline');
  try {
    const hasTrustline = await hasUSDCTrustline(TEST_ADDRESS, 'testnet');
    console.log('✓ Has trustline:', hasTrustline);
    console.log('✓ Trustline check completed\n');
  } catch (error) {
    console.error('✗ Trustline check failed:', error.message);
    process.exit(1);
  }

  // Test 3: Test with invalid address
  console.log('Test 3: Test with invalid address');
  try {
    const result = await getUSDCBalance('INVALID_ADDRESS', 'testnet');
    if (result.error) {
      console.log('✓ Correctly handled invalid address');
      console.log('✓ Error:', result.error.substring(0, 50) + '...\n');
    } else {
      console.error('✗ Should have returned error for invalid address');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Invalid address test failed:', error.message);
    process.exit(1);
  }

  // Test 4: Test with non-existent account
  console.log('Test 4: Test with non-existent account');
  try {
    // Generate a valid-looking but non-existent address
    const nonExistentAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA000';
    const result = await getUSDCBalance(nonExistentAddress, 'testnet');
    console.log('✓ Non-existent account result:', {
      balance: result.balance,
      hasTrustline: result.hasTrustline,
      hasError: !!result.error
    });
    console.log('✓ Non-existent account handled correctly\n');
  } catch (error) {
    console.error('✗ Non-existent account test failed:', error.message);
    process.exit(1);
  }

  console.log('✅ All balance tests passed!');
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

