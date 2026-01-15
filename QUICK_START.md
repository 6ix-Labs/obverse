# Quick Start Guide

## Testing the New Payment Endpoint

### Prerequisites
1. MongoDB must be running
2. Environment variables must be configured (`.env` file)

### Step 1: Start the Server

Open a terminal and run:

```bash
npm run start:dev
```

You should see output like:
```
[Nest] 12345  - 01/12/2026, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 01/12/2026, 10:00:00 AM     LOG [InstanceLoader] AppModule dependencies initialized
...
[Nest] 12345  - 01/12/2026, 10:00:01 AM     LOG [Bootstrap] Application is running on: http://localhost:4000
```

**Note**: If the Telegram bot fails to start due to a conflict, that's okay - the API endpoints will still work.

### Step 2: Test the Endpoint

#### Option A: Using curl (Quick Test)

Open a **new terminal** and test the endpoint:

```bash
# Test validation - empty link code (should return 400)
curl http://localhost:4000/payments/link/%20

# Test validation - too short (should return 400)
curl http://localhost:4000/payments/link/abc

# Test validation - too long (should return 400)
curl http://localhost:4000/payments/link/abcdefghijklmnopqrstuvwxyz

# Test with valid format but non-existent link (should return 404)
curl http://localhost:4000/payments/link/validcode123
```

#### Option B: Run Full Test Suite

In a **new terminal** (with server running), run:

```bash
./test-endpoints.sh
```

This will test all 39 endpoints including the new payment endpoint.

Expected output:
```
=========================================
 API Endpoint Testing
=========================================
 Base URL: http://localhost:4000
=========================================

Checking server connectivity...
✓ Server is running

=== Root Endpoint ===
...
=== Payments Endpoints ===

Testing: GET /payments/link/:linkCode - should return 400 for empty link code
  GET /payments/link/%20
✓ PASSED - Status: 400

...
=========================================
 Test Summary
=========================================
 Passed: 35+
 Failed: 0-5 (may have some failures if database is empty)
 Total:  39
=========================================
```

### Step 3: Test with Real Data

#### 3.1 Create a Payment Link (via Telegram bot or API)

If you have access to create payment links, create one first. The bot will give you a link code like `abc12345`.

#### 3.2 Query Payments for That Link

```bash
curl http://localhost:4000/payments/link/abc12345
```

**If no payments exist yet:**
```json
[]
```

**If payments exist:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "paymentLinkId": {
      "_id": "507f191e810c19729de860ea",
      "linkId": "abc12345",
      "amount": 100,
      "token": "USDC",
      "chain": "solana"
    },
    "merchantId": "507f191e810c19729de860eb",
    "txSignature": "5wHu1qwD...",
    "status": "confirmed",
    "amount": 100,
    "token": "USDC",
    "customerData": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-15T10:25:00.000Z"
  }
]
```

## Troubleshooting

### Server Won't Start

**Error: "Cannot connect to MongoDB"**
- Ensure MongoDB is running
- Check your `.env` file has correct `MONGODB_URI`

**Error: "Telegram bot conflict"**
- This is normal if you have another instance running
- The API endpoints will still work fine
- Stop other instances or use webhook mode instead of polling

### Test Script Shows "Cannot connect to server"

```bash
./test-endpoints.sh
# Output: ✗ ERROR: Cannot connect to server at http://localhost:4000
```

**Solution:**
- Make sure the server is running in another terminal
- Check the server is on port 4000 (check your `.env` or terminal output)
- If using a different port, set `BASE_URL`: `BASE_URL=http://localhost:3000 ./test-endpoints.sh`

### All Tests Return 404

If you're getting 404 for valid endpoints:
- Verify the server started successfully
- Check there are no startup errors
- Try accessing `http://localhost:4000` in a browser - you should see "Hello World!"

### Tests Return "Invalid payment link code format" (400)

This is **correct behavior** for the test cases! The tests are designed to verify validation works.

## Next Steps

1. **Integration**: Integrate the endpoint into your frontend application
2. **Authentication**: Add authentication if needed
3. **Pagination**: Consider adding pagination if payment links receive many payments
4. **Caching**: Add Redis caching for frequently accessed payment links

## API Documentation

For complete API documentation, see:
- [TESTING.md](TESTING.md) - Full endpoint testing documentation
- [NEW_ENDPOINT_SUMMARY.md](NEW_ENDPOINT_SUMMARY.md) - Detailed endpoint documentation
