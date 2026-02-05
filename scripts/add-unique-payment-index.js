/**
 * Migration Script: Add Unique Index to Prevent Duplicate Payments
 *
 * This script adds a unique compound index on {txSignature, chain} to the payments collection
 * to prevent race conditions that could create duplicate payments.
 *
 * Run this ONCE before deploying the updated code:
 * node scripts/add-unique-payment-index.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function addUniqueIndex() {
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

    console.log('📊 Checking for existing duplicate payments...');

    // Find any duplicate payments before adding the unique constraint
    const duplicates = await paymentsCollection.aggregate([
      {
        $group: {
          _id: { txSignature: '$txSignature', chain: '$chain' },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    if (duplicates.length > 0) {
      console.warn(`⚠️  Found ${duplicates.length} duplicate payment groups:`);
      duplicates.forEach(dup => {
        console.warn(`   - Transaction: ${dup._id.txSignature} on ${dup._id.chain} (${dup.count} records)`);
      });
      console.warn('\n⚠️  You need to resolve these duplicates before adding the unique index.');
      console.warn('   Consider keeping the most recent payment and deleting older duplicates.\n');

      // Optionally, you can add code here to automatically resolve duplicates
      // For safety, we'll just report and exit
      process.exit(1);
    }

    console.log('✅ No duplicate payments found');

    console.log('📝 Creating unique index on {txSignature, chain}...');

    // Create the unique compound index
    await paymentsCollection.createIndex(
      { txSignature: 1, chain: 1 },
      {
        unique: true,
        name: 'txSignature_chain_unique'
      }
    );

    console.log('✅ Unique index created successfully!');

    // List all indexes to verify
    console.log('\n📋 Current indexes on payments collection:');
    const indexes = await paymentsCollection.indexes();
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`     (UNIQUE)`);
      }
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('   The database is now protected against duplicate payments.\n');

  } catch (error) {
    console.error('❌ Error during migration:', error.message);

    if (error.code === 11000) {
      console.error('\n⚠️  This error indicates there are duplicate payments in your database.');
      console.error('   Please clean up duplicates before running this migration again.\n');
    }

    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
addUniqueIndex();