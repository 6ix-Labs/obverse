/**
 * Check which merchants have payment links
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MerchantSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
  firstName: String,
  lastName: String,
}, { collection: 'merchants' });

const PaymentLinkSchema = new mongoose.Schema({
  name: String,
  merchantId: mongoose.Schema.Types.ObjectId,
  amount: String,
  currency: String,
  isActive: Boolean,
}, { collection: 'paymentlinks' });

async function checkLinks() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const Merchant = mongoose.model('Merchant', MerchantSchema);
    const PaymentLink = mongoose.model('PaymentLink', PaymentLinkSchema);

    const merchants = await Merchant.find({}).sort({ createdAt: -1 });

    console.log('📊 Merchants with Payment Links:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let merchantsWithLinks = 0;

    for (const merchant of merchants) {
      const links = await PaymentLink.find({ merchantId: merchant._id });

      if (links.length > 0) {
        merchantsWithLinks++;
        console.log(`✅ ${merchant.username || merchant.telegramId} (${merchant.firstName || 'N/A'})`);
        console.log(`   Identifier: ${merchant.username || merchant.telegramId}`);
        console.log(`   Payment Links: ${links.length}`);
        links.forEach((link, idx) => {
          console.log(`   ${idx + 1}. ${link.name} - ${link.amount} ${link.currency} (Active: ${link.isActive})`);
        });
        console.log();
      }
    }

    if (merchantsWithLinks === 0) {
      console.log('❌ No merchants have payment links yet\n');
      console.log('💡 You need to create a payment link first:');
      console.log('   1. Open Telegram bot');
      console.log('   2. Send: /payment (or /create)');
      console.log('   3. Follow prompts to create a payment link');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`\n📌 Found ${merchantsWithLinks} merchant(s) with payment links`);
      console.log('\n💡 To test dashboard:');
      console.log('   1. Pick one of the identifiers above');
      console.log('   2. Login to Telegram as that merchant');
      console.log('   3. Send: /dashboard');
      console.log('   4. Click on a payment link button');
      console.log('   5. Use the credentials in Postman');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkLinks();
