/**
 * Fix existing payment link by converting string merchantId to ObjectId
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;
    const collection = db.collection('paymentlinks');

    console.log('\n🔧 Fixing payment link with string merchantId...\n');

    // Find payment link with string merchantId
    const link = await collection.findOne({
      _id: new mongoose.Types.ObjectId('6981be567d1839b44610e56d')
    });

    if (!link) {
      console.log('❌ Payment link not found');
      await mongoose.disconnect();
      return;
    }

    console.log('Before:');
    console.log('merchantId:', link.merchantId, '(type:', typeof link.merchantId + ')');

    // Update to ObjectId
    await collection.updateOne(
      { _id: link._id },
      { $set: { merchantId: new mongoose.Types.ObjectId(link.merchantId) } }
    );

    // Verify
    const updated = await collection.findOne({ _id: link._id });
    console.log('\nAfter:');
    console.log('merchantId:', updated.merchantId, '(type:', typeof updated.merchantId + ')');

    console.log('\n✅ Fixed! Now try GET /dashboard/overview again in Postman.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fix();
