/**
 * Decode and verify JWT token
 * Usage: node verify-jwt-token.js YOUR_ACCESS_TOKEN
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = process.argv[2];

if (!token) {
  console.error('❌ Usage: node verify-jwt-token.js YOUR_ACCESS_TOKEN');
  console.error('\n   Copy the accessToken from your Postman login response');
  process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('JWT TOKEN DECODED PAYLOAD');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  // Decode without verification first (to see payload even if expired)
  const decoded = jwt.decode(token);

  if (!decoded) {
    console.log('❌ Invalid JWT token format\n');
    process.exit(1);
  }

  console.log('📋 Token Payload:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log();

  // Try to verify with secret
  if (process.env.JWT_SECRET) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token signature is valid\n');

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (verified.exp && verified.exp < now) {
        console.log('⚠️  Token has EXPIRED');
        const expiredAt = new Date(verified.exp * 1000);
        console.log(`   Expired at: ${expiredAt.toISOString()}\n`);
      } else if (verified.exp) {
        const expiresAt = new Date(verified.exp * 1000);
        console.log(`⏰ Token expires at: ${expiresAt.toISOString()}\n`);
      }
    } catch (verifyError) {
      if (verifyError.name === 'TokenExpiredError') {
        console.log('⚠️  Token has EXPIRED');
        console.log(`   Expired at: ${new Date(verifyError.expiredAt).toISOString()}\n`);
      } else if (verifyError.name === 'JsonWebTokenError') {
        console.log('❌ Token signature is INVALID');
        console.log(`   Error: ${verifyError.message}\n`);
      } else {
        throw verifyError;
      }
    }
  } else {
    console.log('⚠️  JWT_SECRET not configured - cannot verify signature\n');
  }

  // Show what to look for
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('KEY FIELDS FOR DASHBOARD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Merchant ID (sub): ${decoded.sub || 'N/A'}`);
  console.log(`Payment Link ID: ${decoded.paymentLinkId || 'N/A'}`);
  console.log(`Session ID: ${decoded.sessionId || 'N/A'}`);
  console.log(`Username: ${decoded.username || 'N/A'}`);
  console.log(`Telegram ID: ${decoded.telegramId || 'N/A'}`);
  console.log();

  if (decoded.paymentLinkId) {
    console.log('💡 The paymentLinkId in your token is:');
    console.log(`   ${decoded.paymentLinkId}`);
    console.log();
    console.log('   Verify this ID exists in the database by running:');
    console.log('   node verify-payment-link.js');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
