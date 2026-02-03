# Dashboard API Testing Guide

This guide explains how to test the dashboard endpoints.

## Prerequisites

1. **Server must be running**: `npm run start:dev` or deployed
2. **Telegram bot must be configured**: Bot should respond to `/dashboard` command
3. **At least one payment link exists**: Create via `/create` command

## Testing Methods

### Method 1: Node.js Test Script (Recommended)

**Features:**
- Comprehensive test suite
- Pretty colored output
- Automatic test result summary
- Tests all 5 endpoints

**Usage:**

```bash
# 1. Get credentials from Telegram
# Open your bot and send: /dashboard
# Select a payment link
# Copy the identifier and password

# 2. Run the test script
node test-dashboard.js <identifier> <password>

# Example:
node test-dashboard.js @johndoe P4ssw0rd1234
```

**What it tests:**
1. ✅ POST `/auth/login` - Login with credentials
2. ✅ GET `/dashboard/overview` - Fetch payment link stats
3. ✅ GET `/dashboard/payments` - Fetch paginated payments
4. ✅ POST `/auth/logout` - Logout
5. ✅ Unauthorized access protection

---

### Method 2: Bash/Curl Script

**Features:**
- Uses curl (no Node.js required)
- Works on any Unix-like system
- Same test coverage as Node.js version

**Usage:**

```bash
# 1. Get credentials from Telegram (same as above)

# 2. Make script executable (first time only)
chmod +x test-dashboard.sh

# 3. Run the test script
./test-dashboard.sh <identifier> <password>

# Example:
./test-dashboard.sh @johndoe P4ssw0rd1234
```

**Custom API URL:**

```bash
API_URL=https://your-api.com ./test-dashboard.sh @johndoe P4ss
```

---

### Method 3: Manual curl Commands

Test individual endpoints manually:

#### 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "@johndoe",
    "password": "P4ssw0rd1234"
  }'
```

**Expected Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "merchant": {
    "id": "507f1f77bcf86cd799439011",
    "telegramId": "123456789",
    "username": "johndoe"
  }
}
```

#### 2. Dashboard Overview (use token from login)

```bash
curl -X GET http://localhost:3000/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "paymentLink": {
    "id": "507f1f77bcf86cd799439011",
    "link": "https://www.obverse.cc/pay/abc123",
    "isActive": true
  },
  "stats": {
    "totalPayments": 15,
    "pendingPayments": 3,
    "confirmedPayments": 10,
    "failedPayments": 2,
    "totalAmount": 1500.50,
    "currency": "USD"
  },
  "recentPayments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "amount": 100,
      "currency": "USD",
      "status": "CONFIRMED",
      "createdAt": "2026-02-02T10:30:00.000Z"
    }
  ]
}
```

#### 3. Dashboard Payments (paginated)

```bash
curl -X GET "http://localhost:3000/dashboard/payments?limit=10&skip=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "amount": 100,
      "currency": "USD",
      "status": "CONFIRMED",
      "createdAt": "2026-02-02T10:30:00.000Z"
    }
  ],
  "total": 15,
  "limit": 10,
  "skip": 0
}
```

#### 4. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

#### 5. Unauthorized Access (should fail)

```bash
curl -X GET http://localhost:3000/dashboard/overview
```

**Expected Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## End-to-End Testing Flow

### Step 1: Create Payment Link (Telegram)

```
User → Bot: /create
Bot → User: "Enter payment link details..."
User → Bot: [Provides details]
Bot → User: ✅ Payment link created: https://www.obverse.cc/pay/abc123
```

### Step 2: Request Dashboard (Telegram)

```
User → Bot: /dashboard
Bot → User: "📊 Select Payment Link"
          [Button 1: Payment Link #1 - 5 payments]
          [Button 2: Payment Link #2 - 0 payments]

User → Bot: [Clicks Button 1]
Bot → User: "🔐 Dashboard Access Created

          🌐 Dashboard URL: https://www.obverse.cc/dashboard

          👤 Identifier: @johndoe
          🔑 Temporary Password: P4ssw0rd1234
          ⏰ Expires in 2 hours"
```

### Step 3: Test Backend API

```bash
# Run automated tests
node test-dashboard.js @johndoe P4ssw0rd1234

# Or manual curl
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"@johndoe","password":"P4ssw0rd1234"}'
```

### Step 4: Access Dashboard (Frontend - Future)

```
User → Browser: https://www.obverse.cc/dashboard
Frontend → User: Login form
User → Frontend: Enters @johndoe + P4ssw0rd1234
Frontend → Backend: POST /auth/login
Backend → Frontend: JWT token
Frontend → Backend: GET /dashboard/overview (with JWT)
Backend → Frontend: Dashboard data
Frontend → User: Beautiful charts and payment table
```

---

## Expected Test Results

When running `node test-dashboard.js`:

```
🧪 Dashboard API Test Suite
🔗 Testing API at: http://localhost:3000

============================================================
TEST 1: POST /auth/login
============================================================

✓ Login successful
Status: 200
Response: {
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

✓ JWT token received

============================================================
TEST 2: GET /dashboard/overview
============================================================

✓ Dashboard overview fetched
Status: 200

📊 Key Metrics:
  Total Payments: 15
  Pending: 3
  Confirmed: 10
  Failed: 2
  Total Amount: 1500.50 USD

============================================================
TEST 3: GET /dashboard/payments?limit=10&skip=0
============================================================

✓ Payments fetched
Status: 200

📋 Found 15 payments

Recent Payments:
  1. CONFIRMED - 100 USD
     ID: 507f1f77bcf86cd799439011
     Created: 2026-02-02T10:30:00.000Z

============================================================
TEST 4: POST /auth/logout
============================================================

✓ Logout successful
Status: 200

============================================================
TEST 5: Unauthorized Access (no token)
============================================================

✓ Correctly blocked unauthorized request
Status: 401

============================================================
TEST SUMMARY
============================================================

Total Tests: 5
✓ Passed: 5
✗ Failed: 0

🎉 All tests passed!
```

---

## Common Issues & Solutions

### Issue: "Cannot connect to server"

**Solution:**
```bash
# Check if server is running
ps aux | grep node

# Start the server
npm run start:dev

# Check port 3000 is listening
lsof -i :3000
```

### Issue: "401 Unauthorized" on login

**Possible causes:**
1. **Password expired** (2 hours)
   - Solution: Request new dashboard link via `/dashboard`

2. **Wrong credentials**
   - Solution: Double-check identifier and password from Telegram

3. **Merchant not found**
   - Solution: Ensure merchant exists in database

### Issue: "No payments found"

**This is normal if:**
- Payment link is new
- No payments have been made yet

**To test with data:**
```bash
# Create test payment via Telegram
/pay <payment-link-url>
```

### Issue: "jwt malformed" error

**Cause:** Invalid or corrupted JWT token

**Solution:**
1. Login again to get fresh token
2. Ensure token is properly formatted in Authorization header
3. Check JWT_SECRET in .env matches between login and validation

---

## Security Testing

### Test 1: Expired Password

```bash
# 1. Get credentials from /dashboard
# 2. Wait 2 hours
# 3. Try to login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"@johndoe","password":"OLD_PASSWORD"}'

# Expected: 401 Unauthorized - "Invalid or expired credentials"
```

### Test 2: Access Another Merchant's Data

```bash
# 1. Login as Merchant A
# 2. Get JWT token for Payment Link 1
# 3. Try to access Payment Link 2 (owned by Merchant B)

# This should FAIL because paymentLinkId is embedded in JWT
# Backend validates ownership on every request
```

### Test 3: Brute Force Protection

```bash
# Try multiple wrong passwords
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"@johndoe","password":"WRONG_'$i'"}'
done

# Note: Add rate limiting middleware to protect against this
```

---

## Performance Testing

### Load Test with Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils  # Ubuntu/Debian
brew install httpd  # macOS

# Test login endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 -T 'application/json' \
  -p login.json \
  http://localhost:3000/auth/login

# login.json:
# {"identifier":"@johndoe","password":"P4ssw0rd1234"}
```

### Test with wrk

```bash
# Install wrk
git clone https://github.com/wg/wrk.git
cd wrk && make

# Test dashboard overview (requires JWT in header)
./wrk -t4 -c100 -d30s \
  -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/dashboard/overview
```

---

## Next Steps

After testing the backend:

1. **Deploy to production**: Follow [MIGRATION.md](MIGRATION.md)
2. **Build frontend**: Create Next.js dashboard UI
3. **Monitor logs**: Check for errors in production
4. **Add monitoring**: Set up logging/analytics

---

## Support

If you encounter issues:

1. Check server logs: `pm2 logs` or console output
2. Verify .env configuration
3. Test with curl to isolate frontend/backend issues
4. Check MongoDB connection and indexes
