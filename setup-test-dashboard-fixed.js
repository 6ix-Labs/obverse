/**
 * Setup test dashboard credentials with CORRECT schema
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Correct schemas matching the application
const MerchantSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
  firstName: String,
  lastName: String,
  walletAddress: String,
}, { collection: 'merchants' });

const PaymentLinkSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  linkId: { type: String, required: true, unique: true }, // Short ID like 'x7k9m2'
  amount: { type: Number, required: true }, // NUMBER, not string
  token: { type: String, required: true, default: 'USDC' }, // NOT 'currency'
  chain: { type: String, required: true, default: 'solana' },
  recipientWalletAddress: String,
  description: String,
  customFields: { type: Array, default: [] },
  isReusable: { type: Boolean, default: false },
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  paymentCount: { type: Number, default: 0 },
  lastPaidAt: Date,
}, { collection: 'paymentlinks', timestamps: true });

const DashboardSessionSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },
  paymentLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentLink' },
  passwordHash: String,
  expiresAt: Date,
  isUsed: { type: Boolean, default: false },
  isRevoked: { type: Boolean, default: false },
  lastUsedAt: Date,
  ipAddress: String,
  userAgent: String,
}, { collection: 'dashboardsessions', timestamps: true });

// Generate readable password
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate short linkId (6 chars)
function generateLinkId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let linkId = '';
  for (let i = 0; i < 6; i++) {
    linkId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return linkId;
}

async function setup() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const Merchant = mongoose.model('Merchant', MerchantSchema);
    const PaymentLink = mongoose.model('PaymentLink', PaymentLinkSchema);
    const DashboardSession = mongoose.model('DashboardSession', DashboardSessionSchema);

    // Get all merchants
    const merchants = await Merchant.find({}).sort({ createdAt: -1 });

    if (merchants.length === 0) {
      console.log('❌ No merchants found');
      process.exit(1);
    }

    console.log('📊 Available Merchants:\n');
    merchants.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.username || m.telegramId} (${m.firstName || 'N/A'})`);
    });

    // Use first merchant
    const merchant = merchants[0];
    console.log(`\n✅ Using merchant: ${merchant.username || merchant.telegramId}`);
    console.log(`   ID: ${merchant._id}`);
    console.log(`   Wallet: ${merchant.walletAddress}\n`);

    // Step 1: Create payment link with CORRECT schema
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Creating Payment Link (Correct Schema)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const linkId = generateLinkId();
    const paymentLink = await PaymentLink.create({
      merchantId: merchant._id,
      linkId: linkId, // Short ID like 'abc123'
      amount: 100, // NUMBER, not string
      token: 'USDC', // NOT 'currency'
      chain: 'solana',
      recipientWalletAddress: merchant.walletAddress,
      description: 'Test payment link for dashboard API testing',
      isReusable: true,
      isActive: true,
      paymentCount: 0,
    });

    console.log('✅ Payment link created:');
    console.log(`   _id: ${paymentLink._id}`);
    console.log(`   linkId: ${paymentLink.linkId}`);
    console.log(`   amount: ${paymentLink.amount} ${paymentLink.token}`);
    console.log(`   chain: ${paymentLink.chain}`);
    console.log(`   wallet: ${paymentLink.recipientWalletAddress}\n`);

    // Step 2: Generate credentials
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Generating Dashboard Credentials');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const temporaryPassword = generatePassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const session = await DashboardSession.create({
      merchantId: merchant._id,
      paymentLinkId: paymentLink._id,
      passwordHash,
      expiresAt,
      isUsed: false,
      isRevoked: false,
    });

    console.log('✅ Dashboard session created:');
    console.log(`   Session ID: ${session._id}`);
    console.log(`   Expires: ${expiresAt.toISOString()}\n`);

    // Display credentials
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 DASHBOARD CREDENTIALS FOR POSTMAN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Copy these to Postman:\n');
    console.log(`   merchant_identifier: ${merchant.username || merchant.telegramId}`);
    console.log(`   temp_password: ${temporaryPassword}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 Test in Postman:\n');
    console.log('   1. Update variables in Postman');
    console.log('   2. POST /auth/login → Get token');
    console.log('   3. GET /dashboard/overview → View stats');
    console.log('   4. GET /dashboard/payments → View payments\n');
    console.log('⏰ Expires in 2 hours\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected\n');
  }
}

setup();
