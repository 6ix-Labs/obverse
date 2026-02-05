/**
 * Test Script: Verify Duplicate Payment Prevention
 *
 * This script tests that the unique index correctly prevents duplicate payments
 * even when multiple requests arrive simultaneously.
 *
 * Usage: node scripts/test-duplicate-payment-prevention.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function testDuplicatePrevention() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();

    const db = client.db();
    const paymentsCollection = db.collection('payments');

    // Generate test data
    const testTxSignature = `test_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const testChain = 'solana';
    const testPaymentLinkId = new ObjectId();
    const testMerchantId = new ObjectId();

    console.log(`\n🧪 Testing duplicate payment prevention...`);
    console.log(`   Test Transaction: ${testTxSignature}`);
    console.log(`   Chain: ${testChain}\n`);

    // Test 1: Insert first payment (should succeed)
    console.log('Test 1: Inserting first payment...');
    try {
      await paymentsCollection.insertOne({
        paymentLinkId: testPaymentLinkId,
        merchantId: testMerchantId,
        txSignature: testTxSignature,
        chain: testChain,
        amount: 100,
        token: 'USDC',
        fromAddress: 'test_from_address',
        toAddress: 'test_to_address',
        customerData: {},
        status: 'pending',
        confirmations: 0,
        webhookSent: false,
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ First payment inserted successfully\n');
    } catch (error) {
      console.error('❌ Failed to insert first payment:', error.message);
      throw error;
    }

    // Test 2: Try to insert duplicate payment (should fail)
    console.log('Test 2: Attempting to insert duplicate payment...');
    try {
      await paymentsCollection.insertOne({
        paymentLinkId: testPaymentLinkId,
        merchantId: testMerchantId,
        txSignature: testTxSignature,  // Same transaction!
        chain: testChain,               // Same chain!
        amount: 100,
        token: 'USDC',
        fromAddress: 'test_from_address',
        toAddress: 'test_to_address',
        customerData: {},
        status: 'pending',
        confirmations: 0,
        webhookSent: false,
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.error('❌ FAILED: Duplicate payment was inserted! Unique index is not working.');
      throw new Error('Unique index not enforcing uniqueness');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✅ Duplicate payment correctly rejected (Error code: 11000)\n');
      } else {
        console.error('❌ Unexpected error:', error.message);
        throw error;
      }
    }

    // Test 3: Simulate race condition with Promise.all
    console.log('Test 3: Simulating race condition with 5 concurrent requests...');
    const testTxSignature2 = `test_tx_race_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const concurrentInserts = Array(5).fill().map((_, index) =>
      paymentsCollection.insertOne({
        paymentLinkId: testPaymentLinkId,
        merchantId: testMerchantId,
        txSignature: testTxSignature2,  // All use same transaction
        chain: testChain,
        amount: 200,
        token: 'USDC',
        fromAddress: 'test_from_address',
        toAddress: 'test_to_address',
        customerData: {},
        status: 'pending',
        confirmations: 0,
        webhookSent: false,
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).catch(err => ({ error: err }))
    );

    const results = await Promise.allSettled(concurrentInserts);

    const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    const failed = results.filter(r => r.status === 'rejected' || r.value?.error?.code === 11000).length;

    console.log(`   Results: ${successful} succeeded, ${failed} rejected`);

    if (successful === 1 && failed === 4) {
      console.log('✅ Race condition handled correctly - only 1 payment created\n');
    } else {
      console.error(`❌ FAILED: Expected 1 success and 4 failures, got ${successful} successes and ${failed} failures`);
      throw new Error('Race condition not properly handled');
    }

    // Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await paymentsCollection.deleteMany({
      txSignature: { $in: [testTxSignature, testTxSignature2] }
    });
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All tests passed! Duplicate payment prevention is working correctly.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the tests
testDuplicatePrevention();