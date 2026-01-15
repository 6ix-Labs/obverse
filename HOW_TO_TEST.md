# How to Test Your API Endpoints

## TL;DR - Quick Test

```bash
# Terminal 1: Start server
npm run start:dev

# Terminal 2: Run tests
./test-endpoints.sh
```

---

## Complete Testing Guide

### Option 1: Automated Test Script (Recommended)

The bash test script tests all endpoints against a running server.

**Step 1:** Start the server
```bash
npm run start:dev
```

Wait for the message:
```
[Bootstrap] Application is running on: http://localhost:4000
```

**Step 2:** Open a new terminal and run tests
```bash
./test-endpoints.sh
```

**Expected Results:**
- ✅ Most validation tests should **PASS** (400 errors for bad input)
- ⚠️ Some tests may **FAIL** if database is empty (404 errors for non-existent data)
- ❌ Tests will **FAIL** if server isn't running (connection errors)

---

### Option 2: Jest E2E Tests

Jest tests don't require a running server but need MongoDB and proper environment setup.

**Run E2E tests:**
```bash
npm run test:e2e
```

**Known Issues:**
- Tests may timeout if MongoDB connection is slow
- Telegram bot conflicts can cause failures
- First run may take 30+ seconds to initialize

---

### Option 3: Manual Testing with curl

Test individual endpoints manually.

#### Test the New Payment Endpoint

```bash
# 1. Test validation - empty link code (expect 400)
curl -i http://localhost:4000/payments/link/%20

# 2. Test validation - too short (expect 400)
curl -i http://localhost:4000/payments/link/abc

# 3. Test validation - too long (expect 400)
curl -i http://localhost:4000/payments/link/abcdefghijklmnopqrstuvwxyz

# 4. Test valid format but non-existent (expect 404)
curl -i http://localhost:4000/payments/link/validcode123

# 5. Test with real payment link code (expect 200 with data or empty array)
curl -i http://localhost:4000/payments/link/REAL_CODE_HERE
```

#### Test Other Endpoints

**Root endpoint:**
```bash
curl http://localhost:4000
# Should return: Hello World!
```

**Get payment link:**
```bash
curl http://localhost:4000/payment-links/abc12345
```

**Create transaction:**
```bash
curl -X POST http://localhost:4000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant123",
    "txSignature": "signature123",
    "chain": "solana",
    "type": "payment",
    "fromAddress": "from123",
    "toAddress": "to123"
  }'
```

---

## Understanding Test Results

### ✅ PASSED Tests
These should pass when server is running correctly:

```
✓ PASSED - Status: 400
```
- 400 errors for invalid input = **CORRECT**
- Validates that error handling works

### ⚠️ Expected Failures
These are normal if database is empty:

```
✗ FAILED - Expected: 404, Got: 500
```
- Some endpoints may return 500 instead of 404 when database is not set up
- Not critical for validation testing

### ❌ Critical Failures
These indicate problems:

```
✗ FAILED - Expected: 200, Got: 000
```
- Status 000 = Cannot connect to server
- **Solution:** Start the server first

```
✗ FAILED - Expected: 400, Got: 200
```
- Validation is not working
- **Solution:** Check endpoint implementation

---

## Test Coverage

### Current Coverage: 51 E2E Tests

**Endpoints tested:**
1. ✅ Root endpoint (1 test)
2. ✅ Payment Links (4 tests)
3. ✅ Transactions (32 tests)
   - Creating transactions
   - Retrieving by signature/ID/merchant
   - Stats and swaps
   - Confirm/fail/update operations
4. ✅ **Payments** (4 tests) - **NEW**
   - Get payments by link code
   - Validation tests
5. ✅ Empty controllers (4 tests)

### Bash Script: 39 Tests

Same coverage as E2E but runs against live server.

---

## Troubleshooting

### "Cannot connect to server"

**Problem:**
```
✗ ERROR: Cannot connect to server at http://localhost:4000
```

**Solution:**
1. Check server is running: `ps aux | grep nest`
2. Start server: `npm run start:dev`
3. Wait for "Application is running" message
4. Verify port: `curl http://localhost:4000`

### "Telegram bot conflict"

**Problem:**
```
❌ Failed to start Telegram bot: 409: Conflict
```

**Impact:**
- API endpoints still work fine
- Only affects bot functionality

**Solution (optional):**
- Stop other bot instances
- Or ignore if you only need API endpoints

### "Cannot connect to MongoDB"

**Problem:**
```
MongooseError: Cannot connect to database
```

**Solution:**
1. Check MongoDB is running: `systemctl status mongodb`
2. Verify connection string in `.env`
3. Test connection: `mongo` or `mongosh`

### Tests timeout after 30 seconds

**Problem:**
```
Exceeded timeout of 30000 ms
```

**Solution:**
1. Check MongoDB connection is fast
2. Increase timeout in test config if needed
3. Use bash script instead (no timeout issues)

---

## Custom Test Configurations

### Test Different Port

```bash
BASE_URL=http://localhost:3000 ./test-endpoints.sh
```

### Test Production Server

```bash
BASE_URL=https://api.yourapp.com ./test-endpoints.sh
```

### Test Specific Endpoints Only

Edit `test-endpoints.sh` and comment out sections you don't want to test.

---

## Next Steps

1. ✅ You've tested the endpoints
2. 📚 Read the API documentation: [NEW_ENDPOINT_SUMMARY.md](NEW_ENDPOINT_SUMMARY.md)
3. 🚀 Integrate into your application
4. 🔒 Add authentication if needed
5. 📊 Monitor endpoint performance in production

## More Information

- **Full Testing Guide:** [TESTING.md](TESTING.md)
- **Quick Start:** [QUICK_START.md](QUICK_START.md)
- **Endpoint Details:** [NEW_ENDPOINT_SUMMARY.md](NEW_ENDPOINT_SUMMARY.md)
