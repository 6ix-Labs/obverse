/**
 * Setup test dashboard credentials for testing in Postman
 * This creates a payment link and generates dashboard credentials
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Schemas
const MerchantSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
  firstName: String,
  lastName: String,
  walletAddress: String,
}, { collection: 'merchants' });

const PaymentLinkSchema = new mongoose.Schema({
  name: String,
  merchantId: mongoose.Schema.Types.ObjectId,
  amount: String,
  currency: String,
  isActive: { type: Boolean, default: true },
  description: String,
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

// Generate readable password (same logic as dashboard-auth.service.ts)
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
      console.log('❌ No merchants found. Please register via Telegram bot first.');
      process.exit(1);
    }

    console.log('📊 Available Merchants:\n');
    merchants.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.username || m.telegramId} (${m.firstName || 'N/A'} ${m.lastName || ''})`);
    });

    // Use first merchant for simplicity, or you can modify this
    const merchant = merchants[0];
    console.log(`\n✅ Using merchant: ${merchant.username || merchant.telegramId}`);
    console.log(`   Telegram ID: ${merchant.telegramId}`);
    console.log(`   Name: ${merchant.firstName || ''} ${merchant.lastName || ''}\n`);

    // Step 1: Create a test payment link
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Creating Test Payment Link');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const paymentLink = await PaymentLink.create({
      merchantId: merchant._id,
      name: 'Test Dashboard Payment Link',
      description: 'Payment link for testing dashboard API',
      amount: '100.00',
      currency: 'USDC',
      isActive: true,
    });

    console.log('✅ Payment link created:');
    console.log(`   ID: ${paymentLink._id}`);
    console.log(`   Name: ${paymentLink.name}`);
    console.log(`   Amount: ${paymentLink.amount} ${paymentLink.currency}\n`);

    // Step 2: Generate temporary password
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
    console.log(`   Expires at: ${expiresAt.toISOString()}\n`);

    // Step 3: Display credentials
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 DASHBOARD CREDENTIALS FOR POSTMAN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 Copy these values to Postman:');
    console.log('');
    console.log(`   merchant_identifier: ${merchant.username || merchant.telegramId}`);
    console.log(`   temp_password: ${temporaryPassword}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🚀 Now you can test in Postman:');
    console.log('');
    console.log('   1. Update Postman variables:');
    console.log(`      - merchant_identifier = ${merchant.username || merchant.telegramId}`);
    console.log(`      - temp_password = ${temporaryPassword}`);
    console.log('');
    console.log('   2. POST /auth/login');
    console.log('      → You\'ll get an access token (auto-saved)');
    console.log('');
    console.log('   3. GET /dashboard/overview');
    console.log('      → View payment link stats');
    console.log('');
    console.log('   4. GET /dashboard/payments');
    console.log('      → View payments list (will be empty initially)');
    console.log('');
    console.log('⏰ Credentials expire in 2 hours');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

setup();
