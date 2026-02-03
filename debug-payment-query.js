/**
 * Debug script to check payment link and its payments
 */
const mongoose = require('mongoose');
require('dotenv').config();

const PaymentLinkSchema = new mongoose.Schema({
  linkId: String,
  merchantId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  token: String,
  isActive: Boolean,
  paymentCount: Number,
}, { collection: 'paymentlinks' });

const PaymentSchema = new mongoose.Schema({
  paymentLinkId: mongoose.Schema.Types.ObjectId,
  merchantId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  token: String,
  txSignature: String,
  status: String,
}, { collection: 'payments', timestamps: true });

async function debugPayments() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const PaymentLink = mongoose.model('PaymentLink', PaymentLinkSchema);
    const Payment = mongoose.model('Payment', PaymentSchema);

    const linkCode = 'bv4G893l';

    console.log(`🔍 Searching for payment link: ${linkCode}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Find the payment link
    const link = await PaymentLink.findOne({ linkId: linkCode });

    if (!link) {
      console.log(`❌ Payment link "${linkCode}" not found!`);

      // Show recent links
      console.log('\n📋 Recent payment links:');
      const recentLinks = await PaymentLink.find().sort({ createdAt: -1 }).limit(5);
      recentLinks.forEach(l => {
        console.log(`   - ${l.linkId} (ID: ${l._id}, Active: ${l.isActive})`);
      });
    } else {
      console.log('✅ Payment link found:');
      console.log(`   MongoDB _id: ${link._id}`);
      console.log(`   linkId: ${link.linkId}`);
      console.log(`   Amount: ${link.amount} ${link.token}`);
      console.log(`   Active: ${link.isActive}`);
      console.log(`   Payment Count: ${link.paymentCount}`);

      console.log('\n🔍 Querying payments with paymentLinkId...');

      // Try different query methods
      const query1 = await Payment.find({ paymentLinkId: link._id });
      const query2 = await Payment.find({ paymentLinkId: new mongoose.Types.ObjectId(link._id) });
      const query3 = await Payment.find({ paymentLinkId: link._id.toString() });

      console.log(`\n📊 Query Results:`);
      console.log(`   Query 1 (link._id): ${query1.length} payments`);
      console.log(`   Query 2 (new ObjectId): ${query2.length} payments`);
      console.log(`   Query 3 (toString): ${query3.length} payments`);

      if (query1.length > 0) {
        console.log('\n💰 Payments found:');
        query1.forEach((p, idx) => {
          console.log(`   ${idx + 1}. ${p.amount} ${p.token}`);
          console.log(`      ID: ${p._id}`);
          console.log(`      TxSig: ${p.txSignature}`);
          console.log(`      Status: ${p.status}`);
          console.log(`      Created: ${p.createdAt}`);
        });
      }

      // Check all recent payments
      console.log('\n📋 Recent payments in database (all links):');
      const allPayments = await Payment.find().sort({ createdAt: -1 }).limit(5);
      allPayments.forEach(p => {
        const matches = p.paymentLinkId.toString() === link._id.toString();
        console.log(`   - Payment ${p._id}`);
        console.log(`     PaymentLinkId: ${p.paymentLinkId}`);
        console.log(`     Amount: ${p.amount} ${p.token}`);
        console.log(`     Matches our link: ${matches ? '✅ YES' : '❌ NO'}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

debugPayments();