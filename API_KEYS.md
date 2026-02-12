# Obverse API Key Authentication

## Overview

Obverse now supports **API key authentication** for external agents and integrations (like OpenClaw) to access payment endpoints programmatically.

### Key Features:
- ✅ **Separate from Telegram Auth** - Telegram merchants don't need API keys
- ✅ **Backward Compatible** - Existing Telegram bot flow still works
- ✅ **Secure** - Keys are unique, can be revoked, and track usage
- ✅ **Flexible** - Set expiration dates, custom names, metadata
- ✅ **Per-Merchant** - Each merchant can generate multiple API keys

---

## How It Works

### Two Authentication Methods:

1. **Telegram Bot Users** (existing):
   - No API key needed
   - Authenticate via Telegram
   - Access endpoints directly from bot

2. **External Agents** (new):
   - Generate API key from dashboard
   - Include `X-API-Key` header in requests
   - Access payment endpoints programmatically

### Endpoint Protection:

- **Dashboard endpoints** (`/dashboard/*`): Require JWT auth (login)
- **API Key endpoints** (`/api-keys/*`): Require JWT auth (to manage keys)
- **Payment endpoints** (`/payment-links/*`, `/payments/*`): Support **BOTH** Telegram and API key auth
  - If `X-API-Key` header provided: Validate it
  - If no header: Allow (backward compatibility)

---

## Generating API Keys

### Method 1: Public API Endpoint (Recommended for Agents) ⭐

**No authentication required!** Just provide your Telegram ID or Merchant ID:

```bash
# Generate API key with your Telegram ID
curl -X POST https://obverse.onrender.com/api-keys/create \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": "123456789",
    "name": "OpenClaw Production",
    "expiresAt": "2027-12-31T23:59:59.999Z"
  }'

# OR with your Merchant ID
curl -X POST https://obverse.onrender.com/api-keys/create \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "507f1f77bcf86cd799439011",
    "name": "OpenClaw Production"
  }'

# Returns API key (SAVE IT - shown only once!)
{
  "success": true,
  "apiKey": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "OpenClaw Production",
    "merchantId": "507f1f77bcf86cd799439011",
    "isActive": true,
    "createdAt": "2026-02-11T12:00:00Z"
  },
  "key": "obv_sk_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z",
  "message": "⚠️ Save this key securely! It will not be shown again."
}
```

**⚠️ Important:** The `key` is shown **only once**. Save it securely!

---

### Method 2: Dashboard Login (For Web Users)

If you prefer using the dashboard:

```bash
# Step 1: Login with Telegram credentials
curl -X POST https://obverse.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "your_telegram_id",
    "password": "your_dashboard_password"
  }'

# Step 2: Generate API key with JWT token
curl -X POST https://obverse.onrender.com/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenClaw Production",
    "expiresAt": "2027-12-31T23:59:59.999Z"
  }'
```

---

### How to Get Your IDs

**Telegram ID:**
- Use the Telegram bot and send `/start`
- Or use [@userinfobot](https://t.me/userinfobot) on Telegram
- Your ID will look like: `123456789`

**Merchant ID:**
- Check your dashboard URL: `https://obverse.app/dashboard/{merchantId}`
- Or call the bot command: `/myid`
- Looks like: `507f1f77bcf86cd799439011`

---

## Using API Keys

### Include in Request Headers

All payment-related endpoints now accept the `X-API-Key` header:

```bash
# Create payment link with API key
curl -X POST https://obverse.onrender.com/payment-links \
  -H "X-API-Key: obv_sk_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "currency": "USDC",
    "chain": "base",
    "description": "Payment for services"
  }'
```

### Get Payment Link Details

```bash
# Get payment link
curl -X GET https://obverse.onrender.com/payment-links/xyz123 \
  -H "X-API-Key: obv_sk_..."
```

### List Payments

```bash
# Get all payments for a link
curl -X GET https://obverse.onrender.com/payments/link/xyz123 \
  -H "X-API-Key: obv_sk_..."
```

---

## Managing API Keys

### List All Keys

```bash
# List all your API keys
curl -X GET https://obverse.onrender.com/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Returns (keys are masked)
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "OpenClaw Production",
    "key": "obv_sk_1a2b****",
    "isActive": true,
    "lastUsed": "2026-02-11T10:30:00Z",
    "createdAt": "2026-02-01T12:00:00Z",
    "expiresAt": "2027-12-31T23:59:59.999Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "OpenClaw Development",
    "key": "obv_sk_9z8y****",
    "isActive": true,
    "lastUsed": "2026-02-10T15:20:00Z",
    "createdAt": "2026-02-01T12:00:00Z",
    "expiresAt": null
  }
]
```

### Revoke API Key

```bash
# Revoke (deactivate) an API key
curl -X DELETE https://obverse.onrender.com/api-keys/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Returns
{
  "message": "API key revoked successfully",
  "apiKey": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "OpenClaw Production",
    "isActive": false
  }
}
```

---

## OpenClaw Integration

### Setup

The OpenClaw CLI already supports API keys via the `OBVERSE_API_KEY` environment variable.

**Update your OpenClaw config** (`~/.openclaw/openclaw.json`):

```json
{
  "skills": {
    "entries": {
      "obverse-payments": {
        "enabled": true,
        "env": {
          "OBVERSE_API_KEY": "obv_sk_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z"
        }
      }
    }
  }
}
```

### Usage

Once configured, all OpenClaw commands will automatically use your API key:

```bash
# These commands now use your API key
obverse-cli create-link 50 USDC base "Payment"
obverse-cli create-product-link "Shoes" 120 USDC base
obverse-cli create-fundraiser "AI Fund" 5000 USDC base
obverse-cli get-analytics xyz123
obverse-cli list-contributors xyz123
```

---

## Security Best Practices

### ✅ Do:
- **Store keys securely** - Use environment variables or secret managers
- **Use different keys for dev/prod** - Separate keys for different environments
- **Set expiration dates** - Rotate keys periodically (e.g., every 90 days)
- **Name keys descriptively** - "OpenClaw Production", "Development Testing"
- **Revoke unused keys** - Deactivate keys you no longer need
- **Monitor usage** - Check `lastUsed` timestamp regularly

### ❌ Don't:
- **Never commit keys to git** - Use .env files (add to .gitignore)
- **Don't share keys** - Each integration should have its own key
- **Don't log keys** - Avoid printing keys in logs or error messages
- **Don't hardcode keys** - Always use environment variables

---

## API Key Format

```
obv_sk_<64 hexadecimal characters>
```

Example:
```
obv_sk_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d
```

- `obv_` - Prefix identifying Obverse
- `sk_` - Secret key identifier
- `<64 hex chars>` - Cryptographically secure random string

---

## Error Handling

### Common Errors

**401 Unauthorized - No API Key:**
```json
{
  "statusCode": 401,
  "message": "API key is required"
}
```
→ Add `X-API-Key` header to your request

**401 Unauthorized - Invalid Key:**
```json
{
  "statusCode": 401,
  "message": "Invalid or inactive API key"
}
```
→ Check your key, ensure it's active and not revoked

**401 Unauthorized - Expired Key:**
```json
{
  "statusCode": 401,
  "message": "API key has expired"
}
```
→ Generate a new API key

---

## Database Schema

### ApiKey Collection

```typescript
{
  _id: ObjectId,
  key: string,              // The actual API key (hashed in production)
  name: string,             // Friendly name
  merchantId: ObjectId,     // Reference to Merchant
  isActive: boolean,        // Can be revoked
  lastUsed: Date,           // Track usage
  expiresAt: Date,          // Optional expiration
  metadata: Object,         // Additional info
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes:
- `{ key: 1, isActive: 1 }` - Fast auth lookups
- `{ merchantId: 1, isActive: 1 }` - List keys per merchant
- `{ expiresAt: 1 }` - Clean up expired keys

---

## Backward Compatibility

### No Breaking Changes

**Telegram bot users** can continue using Obverse without any changes:
- No API key required
- Existing bot commands work as before
- No migration needed

**External agents** can now use API keys:
- Add `X-API-Key` header to requests
- Access payment endpoints programmatically
- Full API access with merchant permissions

---

## Rate Limiting (Future)

API keys can be extended with rate limiting metadata:

```json
{
  "metadata": {
    "rateLimit": {
      "requestsPerMinute": 60,
      "requestsPerDay": 10000
    },
    "ipWhitelist": ["192.168.1.1", "10.0.0.1"],
    "allowedEndpoints": ["/payment-links", "/payments"]
  }
}
```

---

## API Documentation

Full API docs available at:
- **Swagger UI**: [https://obverse.onrender.com/api-docs](https://obverse.onrender.com/api-docs)
- **REST API Guide**: [https://docs.obverse.app/api](https://docs.obverse.app/api)

---

## Support

- **Email**: support@obverse.app
- **Discord**: [discord.gg/obverse](https://discord.gg/obverse)
- **GitHub Issues**: [github.com/obverse/obverse/issues](https://github.com/obverse/obverse/issues)

---

**Made with ❤️ by the Obverse Team**
