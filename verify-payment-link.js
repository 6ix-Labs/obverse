/**
 * Verify payment link exists and check JWT token payload
 */
const mongoose = require('mongoose');
require('dotenv').config();

const PaymentLinkSchema = new mongoose.Schema({
  name: String,
  merchantId: mongoose.Schema.Types.ObjectId,
  amount: String,
  currency: String,
  isActive: Boolean,
}, { collection: 'paymentlinks', timestamps: true });

async function verify() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const PaymentLink = mongoose.model('PaymentLink', PaymentLinkSchema);

    // List all payment links
    const links = await PaymentLink.find({}).populate('merchantId');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ALL PAYMENT LINKS IN DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (links.length === 0) {
      console.log('❌ No payment links found\n');
    } else {
      console.log(`\n📊 Found ${links.length} payment link(s):\n`);

      links.forEach((link, idx) => {
        console.log(`${idx + 1}. Payment Link:`);
        console.log(`   ID: ${link._id}`);
        console.log(`   Name: ${link.name}`);
        console.log(`   Amount: ${link.amount} ${link.currency}`);
        console.log(`   Merchant ID: ${link.merchantId}`);
        console.log(`   Active: ${link.isActive}`);
        console.log(`   Created: ${link.createdAt}`);
        console.log();
      });
    }

    // Check if JWT_SECRET is set
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('JWT TOKEN VERIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!process.env.JWT_SECRET) {
      console.log('⚠️  JWT_SECRET not found in .env file\n');
    } else {
      console.log('✅ JWT_SECRET is configured\n');
      console.log('💡 To verify your JWT token payload:');
      console.log('   1. Copy your access token from Postman login response');
      console.log('   2. Run: node verify-jwt-token.js YOUR_TOKEN');
      console.log('   3. It will show the paymentLinkId in the token\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

verify();
