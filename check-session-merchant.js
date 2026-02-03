/**
 * Check which merchant owns the recent session
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const MerchantSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
  firstName: String,
  lastName: String,
}, { collection: 'merchants' });

const DashboardSessionSchema = new mongoose.Schema({
  merchantId: mongoose.Schema.Types.ObjectId,
  paymentLinkId: mongoose.Schema.Types.ObjectId,
  passwordHash: String,
  expiresAt: Date,
  isRevoked: Boolean,
  isUsed: Boolean,
}, { collection: 'dashboardsessions', timestamps: true });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const Merchant = mongoose.model('Merchant', MerchantSchema);
    const DashboardSession = mongoose.model('DashboardSession', DashboardSessionSchema);

    // Get the most recent session (the one created at 10:23)
    const session = await DashboardSession.findOne({
      _id: new mongoose.Types.ObjectId('6981be7a7d1839b44610e575')
    });

    if (!session) {
      console.log('❌ Session not found\n');
      process.exit(1);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('MOST RECENT DASHBOARD SESSION (10:23)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Session ID: ${session._id}`);
    console.log(`Merchant ID: ${session.merchantId}`);
    console.log(`Payment Link ID: ${session.paymentLinkId}`);
    console.log(`Expires: ${session.expiresAt}`);
    console.log(`Revoked: ${session.isRevoked}`);
    console.log(`Used: ${session.isUsed}`);

    // Find the merchant
    const merchant = await Merchant.findById(session.merchantId);

    if (!merchant) {
      console.log('\n❌ Merchant not found for this session!\n');
      process.exit(1);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('THIS SESSION BELONGS TO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Username: ${merchant.username || 'N/A'}`);
    console.log(`Telegram ID: ${merchant.telegramId || 'N/A'}`);
    console.log(`Name: ${merchant.firstName || ''} ${merchant.lastName || ''}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TO TEST IN POSTMAN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`merchant_identifier: ${merchant.username || merchant.telegramId}`);
    console.log(`temp_password: [The password you got from Telegram bot]`);

    console.log('\n⚠️  NOTE: You need to use the password that the Telegram bot');
    console.log('   sent you when you created this session (around 10:23).\n');

    // Test the password the user provided
    const providedPassword = '97jdjw5kHbe7';
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TESTING PROVIDED PASSWORD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`You provided password: ${providedPassword}`);
    console.log(`Testing against session hash...\n`);

    const isValid = await bcrypt.compare(providedPassword, session.passwordHash);

    if (isValid) {
      console.log('✅ PASSWORD MATCHES! But identifier is wrong.');
      console.log(`   You used: "Ofuzoremeke"`);
      console.log(`   Should be: "${merchant.username || merchant.telegramId}"\n`);
    } else {
      console.log('❌ Password does NOT match this session.');
      console.log('   This means the password "97jdjw5kHbe7" is for a different session.\n');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

check();
