/**
 * Test basic utilities
 */

const { getNetworkConfig } = require('../dist/config');
const { getHorizonServer, getUSDCAsset, isValidStellarAddress, formatAmount } = require('../dist/utils');

console.log('Testing StellarX402 utilities...\n');

// Test 1: Network configs
console.log('Test 1: Network configurations');
try {
  const mainnetConfig = getNetworkConfig('mainnet');
  const testnetConfig = getNetworkConfig('testnet');
  
  console.log('✓ Mainnet config:', {
    horizonUrl: mainnetConfig.horizonUrl,
    usdc: mainnetConfig.usdc
  });
  console.log('✓ Testnet config:', {
    horizonUrl: testnetConfig.horizonUrl,
    usdc: testnetConfig.usdc
  });
  console.log('✓ Network configs loaded successfully\n');
} catch (error) {
  console.error('✗ Network config test failed:', error.message);
  process.exit(1);
}

// Test 2: USDC Asset creation
console.log('Test 2: USDC Asset creation');
try {
  const mainnetUSDC = getUSDCAsset('mainnet');
  const testnetUSDC = getUSDCAsset('testnet');
  
  console.log('✓ Mainnet USDC:', mainnetUSDC.getCode(), '-', mainnetUSDC.getIssuer());
  console.log('✓ Testnet USDC:', testnetUSDC.getCode(), '-', testnetUSDC.getIssuer());
  console.log('✓ USDC assets created successfully\n');
} catch (error) {
  console.error('✗ USDC asset test failed:', error.message);
  process.exit(1);
}

// Test 3: Address validation
console.log('Test 3: Address validation');
try {
  const validAddress = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
  const invalidAddress1 = 'invalid';
  const invalidAddress2 = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  
  if (!isValidStellarAddress(validAddress)) {
    throw new Error('Valid address marked as invalid');
  }
  if (isValidStellarAddress(invalidAddress1)) {
    throw new Error('Invalid address marked as valid');
  }
  if (isValidStellarAddress(invalidAddress2)) {
    throw new Error('Invalid address marked as valid');
  }
  
  console.log('✓ Address validation working correctly\n');
} catch (error) {
  console.error('✗ Address validation test failed:', error.message);
  process.exit(1);
}

// Test 4: Amount formatting
console.log('Test 4: Amount formatting');
try {
  const tests = [
    ['1.5', '1.50'],
    ['0.01', '0.01'],
    ['100', '100.00'],
    ['invalid', '0.00']
  ];
  
  for (const [input, expected] of tests) {
    const result = formatAmount(input);
    if (result !== expected) {
      throw new Error(`formatAmount('${input}') = '${result}', expected '${expected}'`);
    }
  }
  
  console.log('✓ Amount formatting working correctly\n');
} catch (error) {
  console.error('✗ Amount formatting test failed:', error.message);
  process.exit(1);
}

// Test 5: Horizon server creation
console.log('Test 5: Horizon server creation');
try {
  const mainnetServer = getHorizonServer('mainnet');
  const testnetServer = getHorizonServer('testnet');
  
  console.log('✓ Mainnet server created');
  console.log('✓ Testnet server created\n');
} catch (error) {
  console.error('✗ Horizon server test failed:', error.message);
  process.exit(1);
}

console.log('✅ All utility tests passed!');

