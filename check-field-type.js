/**
 * Check the actual type of paymentLinkId field in database
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function checkFieldType() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;
    const paymentsCollection = db.collection('payments');

    // Get the most recent payment
    const payment = await paymentsCollection.findOne(
      {},
      { sort: { createdAt: -1 } }
    );

    console.log('📄 Recent Payment Document:');
    console.log(JSON.stringify(payment, null, 2));
    console.log('\n🔍 Field Types:');
    console.log(`paymentLinkId type: ${typeof payment.paymentLinkId}`);
    console.log(`paymentLinkId instanceof ObjectId: ${payment.paymentLinkId instanceof mongoose.Types.ObjectId}`);
    console.log(`paymentLinkId value: ${payment.paymentLinkId}`);
    console.log(`paymentLinkId constructor: ${payment.paymentLinkId.constructor.name}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFieldType();