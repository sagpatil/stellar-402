#!/usr/bin/env node

/**
 * Simple test runner
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Building project...\n');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('Running tests...');
console.log('='.repeat(50) + '\n');

try {
  execSync('node test/test-utils.js', { stdio: 'inherit' });
  console.log('\n');
  execSync('node test/test-balance.js', { stdio: 'inherit' });
  console.log('\n');
  execSync('node test/test-transaction.js', { stdio: 'inherit' });
  console.log('\n');
  execSync('node test/test-x402.js', { stdio: 'inherit' });
} catch (error) {
  console.error('\nTests failed');
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('All tests completed successfully!');
console.log('='.repeat(50));

