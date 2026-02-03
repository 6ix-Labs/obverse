/**
 * List all merchants in the database
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MerchantSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
  firstName: String,
  lastName: String,
  walletAddress: String,
}, { collection: 'merchants' });

async function listMerchants() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const Merchant = mongoose.model('Merchant', MerchantSchema);
    const merchants = await Merchant.find({}).sort({ createdAt: -1 });

    if (merchants.length === 0) {
      console.log('❌ No merchants found in database');
      console.log('\n💡 You need to register via Telegram bot first');
      process.exit(0);
    }

    console.log(`📊 Found ${merchants.length} merchant(s):\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    merchants.forEach((m, idx) => {
      console.log(`${idx + 1}. Merchant ID: ${m._id}`);
      console.log(`   Telegram ID: ${m.telegramId || 'N/A'}`);
      console.log(`   Username: ${m.username || 'N/A'}`);
      console.log(`   Name: ${m.firstName || ''} ${m.lastName || ''}`);
      console.log(`   Wallet: ${m.walletAddress || 'N/A'}`);
      console.log(`   ✅ Use identifier: ${m.username || m.telegramId}`);
      console.log();
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Copy one of the identifiers above to use in Postman');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

listMerchants();
