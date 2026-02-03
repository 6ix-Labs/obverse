/**
 * Check all payments for payment link bv4G893l
 */
const mongoose = require('mongoose');
require('dotenv').config();

const PaymentSchema = new mongoose.Schema({
  paymentLinkId: String, // Stored as string in DB
  merchantId: String,
  amount: Number,
  token: String,
  txSignature: String,
  status: String,
}, { collection: 'payments', timestamps: true, strict: false });

async function checkAllPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Payment = mongoose.model('Payment', PaymentSchema);

    const linkId = '6981e985c1dbc49ab16a572d';

    console.log(`🔍 Checking all payments for payment link ID: ${linkId}\n`);

    // Query with string (as it's stored in DB)
    const payments = await Payment.find({ paymentLinkId: linkId }).sort({ createdAt: -1 });

    console.log(`📊 Total Payments Found: ${payments.length}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    payments.forEach((p, idx) => {
      console.log(`\n${idx + 1}. Payment ID: ${p._id}`);
      console.log(`   Amount: ${p.amount} ${p.token}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   TxSignature: ${p.txSignature}`);
      console.log(`   PaymentLinkId: ${p.paymentLinkId}`);
      console.log(`   Created: ${p.createdAt}`);
      if (p.customerData) {
        console.log(`   Customer: ${p.customerData.name || 'N/A'} (${p.customerData.email || 'N/A'})`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAllPayments();