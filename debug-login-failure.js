/**
 * Debug why login is failing despite valid credentials
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MerchantSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
}, { collection: 'merchants' });

const PaymentLinkSchema = new mongoose.Schema({
  linkId: String,
  merchantId: mongoose.Schema.Types.ObjectId,
  amount: mongoose.Schema.Types.Mixed,
  token: String,
}, { collection: 'paymentlinks' });

const DashboardSessionSchema = new mongoose.Schema({
  merchantId: mongoose.Schema.Types.ObjectId,
  paymentLinkId: mongoose.Schema.Types.ObjectId,
  passwordHash: String,
  expiresAt: Date,
  isRevoked: Boolean,
}, { collection: 'dashboardsessions' });

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Merchant = mongoose.model('Merchant', MerchantSchema);
    const PaymentLink = mongoose.model('PaymentLink', PaymentLinkSchema);
    const DashboardSession = mongoose.model('DashboardSession', DashboardSessionSchema);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SIMULATING AUTH SERVICE LOGIC');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 1: Find merchant by identifier
    const identifier = 'Ofuzoremeke';
    console.log(`1. Looking for merchant: "${identifier}"`);

    const merchant = await Merchant.findOne({
      $or: [
        { username: identifier },
        { telegramId: identifier },
      ],
    });

    if (!merchant) {
      console.log('   ❌ Merchant NOT found\n');
      process.exit(1);
    }

    console.log(`   ✅ Found merchant ID: ${merchant._id}\n`);

    // Step 2: Find active session (THIS IS WHERE IT MIGHT FAIL)
    console.log('2. Looking for active session...');
    console.log(`   Query: merchantId=${merchant._id}, not expired, not revoked`);

    const session = await DashboardSession.findOne({
      merchantId: merchant._id,
      expiresAt: { $gt: new Date() },
      isRevoked: false,
    }).sort({ createdAt: -1 }).populate('paymentLinkId');

    if (!session) {
      console.log('   ❌ NO SESSION FOUND!\n');
      console.log('   This is the error you\'re seeing in Postman.\n');

      // Let's check why
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('DEBUGGING: Why no session found?');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Check if session exists without populate
      const sessionWithoutPopulate = await DashboardSession.findOne({
        merchantId: merchant._id,
        expiresAt: { $gt: new Date() },
        isRevoked: false,
      }).sort({ createdAt: -1 });

      if (!sessionWithoutPopulate) {
        console.log('❌ Session doesn\'t exist at all for this merchant\n');
      } else {
        console.log('✅ Session EXISTS without populate!');
        console.log(`   Session ID: ${sessionWithoutPopulate._id}`);
        console.log(`   Payment Link ID: ${sessionWithoutPopulate.paymentLinkId}\n`);

        // Check if payment link exists
        const paymentLink = await PaymentLink.findById(sessionWithoutPopulate.paymentLinkId);

        if (!paymentLink) {
          console.log('❌ FOUND THE ISSUE!');
          console.log('   Payment link does NOT exist in database!');
          console.log(`   Payment Link ID: ${sessionWithoutPopulate.paymentLinkId}`);
          console.log('\n💡 Solution: The payment link was deleted or never created properly.\n');
        } else {
          console.log('✅ Payment link EXISTS');
          console.log(`   Link ID: ${paymentLink.linkId}`);
          console.log(`   Amount: ${paymentLink.amount} ${paymentLink.token}\n`);
          console.log('⚠️  This is weird - everything exists but populate is failing.\n');
        }
      }

      process.exit(1);
    }

    console.log(`   ✅ Session found: ${session._id}`);
    console.log(`   Payment Link: ${session.paymentLinkId?.linkId || 'N/A'}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL CHECKS PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('The login should work! Try again in Postman.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

debug();
