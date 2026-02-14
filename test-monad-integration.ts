/**
 * Monad Integration Test Script
 *
 * This script tests the Monad blockchain integration without requiring
 * a running NestJS server. It validates:
 * 1. Chain configuration
 * 2. Token validation
 * 3. EVM service connectivity
 * 4. Address validation
 */

import {
  getChainConfig,
  getTokenConfig,
  isChainSupported,
  isTokenSupported,
  getSupportedChains,
  getSupportedTokensForChain,
  ChainType,
} from './src/blockchain/config/chains.config';
import { ChainValidator } from './src/blockchain/validators/chain.validator';
import { ethers } from 'ethers';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function section(title: string) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(title, colors.blue);
  log('='.repeat(60), colors.blue);
}

async function testChainConfiguration() {
  section('TEST 1: Chain Configuration');

  // Test 1.1: Check supported chains
  const supportedChains = getSupportedChains();
  if (supportedChains.includes('monad') && supportedChains.includes('solana') && supportedChains.includes('monad_testnet')) {
    success(`Supported chains: ${supportedChains.join(', ')}`);
  } else {
    error('Missing expected chains');
    return false;
  }

  // Test 1.2: Validate Monad chain config
  try {
    const monadConfig = getChainConfig('monad');
    if (monadConfig.chainId === 143) {
      success(`Monad chain ID: ${monadConfig.chainId}`);
    } else {
      error(`Incorrect Monad chain ID: ${monadConfig.chainId}`);
      return false;
    }

    if (monadConfig.nativeCurrency.symbol === 'MON') {
      success(`Monad native currency: ${monadConfig.nativeCurrency.symbol}`);
    } else {
      error(`Incorrect currency: ${monadConfig.nativeCurrency.symbol}`);
      return false;
    }

    if (monadConfig.rpcUrls[0]) {
      success(`Monad RPC URL: ${monadConfig.rpcUrls[0]}`);
    } else {
      error('Missing Monad RPC URL');
      return false;
    }
  } catch (e: any) {
    error(`Failed to get Monad config: ${e.message}`);
    return false;
  }

  // Test 1.3: Validate chain support checks
  if (isChainSupported('monad')) {
    success('isChainSupported("monad") = true');
  } else {
    error('isChainSupported("monad") = false');
    return false;
  }

  if (!isChainSupported('unsupported-chain')) {
    success('isChainSupported("unsupported-chain") = false (correct)');
  } else {
    error('isChainSupported should reject invalid chains');
    return false;
  }

  return true;
}

async function testTokenConfiguration() {
  section('TEST 2: Token Configuration');

  // Test 2.1: Get Monad tokens
  const monadTokens = getSupportedTokensForChain('monad');
  if (monadTokens.includes('MON') && monadTokens.includes('USDC')) {
    success(`Monad tokens: ${monadTokens.join(', ')}`);
  } else {
    error(`Missing expected tokens. Got: ${monadTokens.join(', ')}`);
    return false;
  }

  // Test 2.2: Validate token support
  if (isTokenSupported('monad', 'MON')) {
    success('isTokenSupported("monad", "MON") = true');
  } else {
    error('MON should be supported on Monad');
    return false;
  }

  if (!isTokenSupported('monad', 'INVALID_TOKEN')) {
    success('isTokenSupported("monad", "INVALID_TOKEN") = false (correct)');
  } else {
    error('Should reject invalid tokens');
    return false;
  }

  // Test 2.3: Get token config
  try {
    const monConfig = getTokenConfig('monad', 'MON');
    if (monConfig.decimals === 18 && monConfig.isNative) {
      success(`MON config: ${monConfig.decimals} decimals, native: ${monConfig.isNative}`);
    } else {
      error(`Incorrect MON config`);
      return false;
    }
  } catch (e: any) {
    error(`Failed to get MON config: ${e.message}`);
    return false;
  }

  return true;
}

async function testChainValidator() {
  section('TEST 3: Chain Validator');

  // Test 3.1: Valid chain
  try {
    ChainValidator.validateChain('monad');
    success('validateChain("monad") - passed');
  } catch (e: any) {
    error(`validateChain("monad") failed: ${e.message}`);
    return false;
  }

  // Test 3.2: Invalid chain
  try {
    ChainValidator.validateChain('invalid-chain');
    error('validateChain should reject invalid chains');
    return false;
  } catch (e: any) {
    success(`validateChain("invalid-chain") - correctly rejected`);
  }

  // Test 3.3: Valid token
  try {
    ChainValidator.validateToken('monad', 'MON');
    success('validateToken("monad", "MON") - passed');
  } catch (e: any) {
    error(`validateToken failed: ${e.message}`);
    return false;
  }

  // Test 3.4: Invalid token
  try {
    ChainValidator.validateToken('monad', 'INVALID');
    error('validateToken should reject invalid tokens');
    return false;
  } catch (e: any) {
    success(`validateToken("monad", "INVALID") - correctly rejected`);
  }

  // Test 3.5: Minimum amount validation
  try {
    ChainValidator.validateMinimumAmount('monad', 'MON', 0.001);
    success('validateMinimumAmount for MON - passed');
  } catch (e: any) {
    error(`validateMinimumAmount failed: ${e.message}`);
    return false;
  }

  // Test 3.6: Amount too small
  try {
    ChainValidator.validateMinimumAmount('monad', 'MON', 0.00001);
    error('validateMinimumAmount should reject amounts too small');
    return false;
  } catch (e: any) {
    success(`validateMinimumAmount - correctly rejected small amount`);
  }

  return true;
}

async function testEvmServiceConnection() {
  section('TEST 4: EVM Service - Monad RPC Connection');

  try {
    // Create a provider
    // Create a provider for Monad Mainnet
    const monadConfig = getChainConfig('monad');
    const provider = new ethers.JsonRpcProvider(monadConfig.rpcUrls[0], {
      chainId: monadConfig.chainId,
      name: monadConfig.name,
    });

    // Create a provider for Monad Testnet
    const monadTestnetConfig = getChainConfig('monad_testnet');
    const testnetProvider = new ethers.JsonRpcProvider(monadTestnetConfig.rpcUrls[0], {
      chainId: monadTestnetConfig.chainId,
      name: monadTestnetConfig.name,
    });

    // Test 4.1: Get block number
    const blockNumber = await provider.getBlockNumber();
    if (blockNumber > 0) {
      success(`Connected to Monad! Current block: ${blockNumber}`);
    } else {
      error('Invalid block number');
      return false;
    }

    // Test 4.2: Get network info
    const network = await provider.getNetwork();
    if (network.chainId === 143n) {
      success(`Network chain ID: ${network.chainId} (correct)`);
    } else {
      error(`Wrong network chain ID: ${network.chainId}`);
      return false;
    }

    // Test 4.3: Get gas price
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice && feeData.gasPrice > 0n) {
      success(`Gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
    } else {
      error('Failed to get gas price');
      return false;
    }

    // Test 4.4: Test balance query (random address, should be 0 or valid)
    const testAddress = '0x0000000000000000000000000000000000000000';
    const balance = await provider.getBalance(testAddress);
    success(`Balance query works on Mainnet (test address balance: ${ethers.formatEther(balance)} MON)`);

    // Test 4.5: Testnet Connection
    const testnetBlock = await testnetProvider.getBlockNumber();
    if (testnetBlock > 0) {
      success(`Connected to Monad Testnet! Current block: ${testnetBlock}`);
    } else {
      error('Failed to connect to Monad Testnet');
      return false;
    }

    return true;
  } catch (e: any) {
    error(`EVM service connection failed: ${e.message}`);
    info('Make sure MONAD_RPC_URL is set correctly in .env');
    return false;
  }
}

async function testAddressValidation() {
  section('TEST 5: Address Validation');

  // Test 5.1: Valid Ethereum/Monad address (Vitalik's address as example)
  const validAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  if (ethers.isAddress(validAddress)) {
    success(`Valid EVM address: ${validAddress}`);
  } else {
    error('Failed to validate valid address');
    return false;
  }

  // Test 5.2: Invalid address
  const invalidAddress = 'not-an-address';
  if (!ethers.isAddress(invalidAddress)) {
    success('Correctly rejected invalid address');
  } else {
    error('Should reject invalid addresses');
    return false;
  }

  // Test 5.3: Checksum validation
  try {
    const checksumAddress = ethers.getAddress(validAddress);
    success(`Checksum address: ${checksumAddress}`);
  } catch (e: any) {
    error(`Checksum validation failed: ${e.message}`);
    return false;
  }

  return true;
}

async function testPaymentLinkValidation() {
  section('TEST 6: Payment Link Validation');

  // Test 6.1: Valid Monad payment link data
  try {
    ChainValidator.validatePaymentLinkData({
      chain: 'monad',
      token: 'MON',
      amount: 1.0,
    });
    success('Valid Monad payment link data - passed');

    ChainValidator.validatePaymentLinkData({
      chain: 'monad_testnet',
      token: 'MON',
      amount: 1.0,
    });
    success('Valid Monad Testnet payment link data - passed');
  } catch (e: any) {
    error(`Payment link validation failed: ${e.message}`);
    return false;
  }

  // Test 6.2: Invalid chain
  try {
    ChainValidator.validatePaymentLinkData({
      chain: 'invalid',
      token: 'MON',
      amount: 1.0,
    });
    error('Should reject invalid chain');
    return false;
  } catch (e: any) {
    success('Correctly rejected invalid chain in payment link');
  }

  // Test 6.3: Invalid token for chain
  try {
    ChainValidator.validatePaymentLinkData({
      chain: 'monad',
      token: 'SOL', // Solana token on Monad chain
      amount: 1.0,
    });
    error('Should reject wrong token for chain');
    return false;
  } catch (e: any) {
    success('Correctly rejected wrong token for chain');
  }

  return true;
}

async function runAllTests() {
  log('\n🚀 Starting Monad Integration Tests\n', colors.yellow);

  const tests = [
    { name: 'Chain Configuration', fn: testChainConfiguration },
    { name: 'Token Configuration', fn: testTokenConfiguration },
    { name: 'Chain Validator', fn: testChainValidator },
    { name: 'EVM Service Connection', fn: testEvmServiceConnection },
    { name: 'Address Validation', fn: testAddressValidation },
    { name: 'Payment Link Validation', fn: testPaymentLinkValidation },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (e: any) {
      error(`Test "${test.name}" threw an error: ${e.message}`);
      failed++;
    }
  }

  section('TEST SUMMARY');
  log(`Total Tests: ${tests.length}`, colors.cyan);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, colors.red);

  if (failed === 0) {
    log('\n🎉 All tests passed! Monad integration is working correctly.\n', colors.green);
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.\n', colors.yellow);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((e) => {
  error(`Fatal error: ${e.message}`);
  process.exit(1);
});
