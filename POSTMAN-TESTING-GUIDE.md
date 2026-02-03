# Dashboard API Testing Guide - Postman

This guide will help you test all dashboard endpoints using Postman.

## Prerequisites

1. **Telegram Bot Running**: The bot must be running to generate temporary credentials
2. **Postman Installed**: Download from https://www.postman.com/downloads/
3. **API Server Running**: Your NestJS server must be running

---

## Step 1: Import the Postman Collection

1. Open Postman
2. Click **Import** (top left)
3. Drag and drop `postman-dashboard-collection.json` or click **Choose Files** and select it
4. The collection "Obverse Dashboard API" will appear in your Collections sidebar

---

## Step 2: Set Up Environment Variables

You have two options:

### Option A: Quick Setup (Manual)
1. Click the collection "Obverse Dashboard API"
2. Go to the **Variables** tab
3. Update these variables:
   - `base_url`: Your API URL (e.g., `http://localhost:3000` or your production URL)
   - `merchant_identifier`: Leave empty for now (will get from Telegram)
   - `temp_password`: Leave empty for now (will get from Telegram)

### Option B: Create Postman Environment (Recommended)
1. Click **Environments** in the left sidebar
2. Click **+** to create new environment
3. Name it "Obverse Local" or "Obverse Production"
4. Add these variables:
   ```
   base_url          | http://localhost:3000
   access_token      | (leave empty - auto-populated)
   merchant_identifier | (will get from Telegram)
   temp_password     | (will get from Telegram)
   merchant_id       | (leave empty - auto-populated)
   payment_link_id   | (leave empty - auto-populated)
   ```
5. Click **Save**
6. Select this environment from the dropdown in top right

---

## Step 3: Generate Temporary Credentials via Telegram

### Using Telegram Bot:

1. **Open your Telegram bot** (the one connected to your app)

2. **Send the command**: `/dashboard`

3. **You'll receive a message** showing your payment links with buttons like:
   ```
   📊 Your Dashboard Access

   Select a payment link to generate dashboard credentials:

   [Button: Payment Link Name 1]
   [Button: Payment Link Name 2]
   ```

4. **Click on a payment link button**

5. **You'll receive credentials**:
   ```
   🔐 Dashboard Access Credentials

   Username: your_username (or your telegram ID)
   Password: Abc2Def3GhiJ

   🌐 Dashboard URL: https://your-dashboard-url.com

   ⏰ These credentials expire in 2 hours
   ```

6. **Copy the credentials**:
   - `identifier`: The username or telegram ID shown
   - `password`: The temporary password shown (e.g., "Abc2Def3GhiJ")

---

## Step 4: Update Postman Variables with Credentials

1. Go back to Postman
2. Click on the collection or environment
3. Update the variables:
   - `merchant_identifier`: Paste the username/telegram ID
   - `temp_password`: Paste the temporary password
4. Click **Save**

---

## Step 5: Test the Endpoints

### Test 1: Login

1. Navigate to: **Auth** → **Login**
2. Review the request body (it uses variables you just set):
   ```json
   {
     "identifier": "{{merchant_identifier}}",
     "password": "{{temp_password}}"
   }
   ```
3. Click **Send**

**Expected Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "merchant": {
    "_id": "65abc123...",
    "telegramId": "123456789",
    "username": "merchant_name",
    "walletAddress": "0x...",
    "notificationSettings": { ... }
  },
  "paymentLinkId": "65def456...",
  "expiresAt": "2026-02-03T14:30:00.000Z"
}
```

**Note**: The collection has a test script that automatically saves the `accessToken` to the environment variable, so you don't need to copy it manually.

**Common Errors**:
- `401 Unauthorized`: Wrong password or expired credentials - generate new ones via Telegram
- `404 Not Found`: Wrong identifier or merchant doesn't exist

---

### Test 2: Get Dashboard Overview

1. Navigate to: **Dashboard** → **Get Overview**
2. Check the **Headers** tab - Authorization should show: `Bearer {{access_token}}`
3. Click **Send**

**Expected Response** (200 OK):
```json
{
  "paymentLink": {
    "_id": "65def456...",
    "name": "My Store Payment",
    "description": "Payment link for my store",
    "amount": "100",
    "currency": "USDC",
    "isActive": true,
    "merchantId": "65abc123...",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "lastPaidAt": "2026-02-03T12:00:00.000Z"
  },
  "stats": {
    "totalPayments": 25,
    "totalAmount": "2500.00",
    "pendingPayments": 3,
    "confirmedPayments": 20,
    "failedPayments": 2,
    "successRate": 80,
    "lastPaidAt": "2026-02-03T12:00:00.000Z"
  },
  "recentPayments": [
    {
      "_id": "65ghi789...",
      "paymentLinkId": "65def456...",
      "amount": "100.00",
      "currency": "USDC",
      "status": "confirmed",
      "txHash": "0x1234...",
      "createdAt": "2026-02-03T12:00:00.000Z"
    }
    // ... up to 10 recent payments
  ],
  "chartData": [
    { "date": "2026-02-01", "count": 5, "amount": "500.00" },
    { "date": "2026-02-02", "count": 8, "amount": "800.00" },
    { "date": "2026-02-03", "count": 12, "amount": "1200.00" }
  ]
}
```

**Common Errors**:
- `401 Unauthorized`: Token expired or invalid - login again
- `403 Forbidden`: Payment link doesn't belong to this merchant

---

### Test 3: Get Payments (Paginated)

1. Navigate to: **Dashboard** → **Get Payments (Paginated)**
2. Review the query parameters:
   - `limit`: 50 (how many payments to return)
   - `skip`: 0 (offset for pagination)
3. Click **Send**

**Expected Response** (200 OK):
```json
{
  "payments": [
    {
      "_id": "65ghi789...",
      "paymentLinkId": "65def456...",
      "amount": "100.00",
      "currency": "USDC",
      "status": "confirmed",
      "walletAddress": "0xabc...",
      "txHash": "0x1234...",
      "createdAt": "2026-02-03T12:00:00.000Z",
      "confirmedAt": "2026-02-03T12:05:00.000Z"
    },
    // ... more payments
  ],
  "pagination": {
    "total": 125,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  }
}
```

**Test Pagination**:
- Try: **Get Payments - Page 2** (sets `skip=50` to get next 50 payments)
- Modify query params to test different combinations:
  - `limit=10&skip=0` - First 10 payments
  - `limit=25&skip=25` - Payments 26-50
  - `limit=100&skip=0` - First 100 payments

---

## Step 6: Test Error Scenarios

### Test A: Expired Token
1. Wait 2 hours after login (or manually clear the token)
2. Try accessing **Get Overview** or **Get Payments**
3. Expected: `401 Unauthorized` - You'll need to login again

### Test B: Invalid Token
1. Manually edit the `access_token` variable to something invalid
2. Try accessing any protected endpoint
3. Expected: `401 Unauthorized`

### Test C: Wrong Credentials
1. Change `temp_password` to a wrong value
2. Try the **Login** request
3. Expected: `401 Unauthorized` with error message

### Test D: Accessing Another Merchant's Data
This is automatically prevented - the JWT token is scoped to a specific payment link, so you can only see data for that link.

---

## Complete Testing Flow

```
1. Start Telegram bot and API server
   ↓
2. Send /dashboard command in Telegram
   ↓
3. Click a payment link button
   ↓
4. Receive temporary credentials (identifier + password)
   ↓
5. Copy credentials to Postman variables
   ↓
6. POST /auth/login
   ├─ Success → accessToken saved automatically
   └─ Failure → Check credentials and try again
   ↓
7. GET /dashboard/overview
   ├─ View payment link stats and recent payments
   └─ Check response for expected data
   ↓
8. GET /dashboard/payments?limit=50&skip=0
   ├─ View paginated payments list
   └─ Test pagination with different skip/limit values
   ↓
9. Test expires after 2 hours
   └─ Must repeat from step 2 to get new credentials
```

---

## Tips for Testing

1. **Auto Token Refresh**: The Login request has a test script that automatically saves the token, so you don't need to copy it manually.

2. **Multiple Payment Links**: To test different payment links:
   - Run `/dashboard` command again
   - Click a different payment link button
   - Get new credentials
   - Login with new credentials
   - The JWT will be scoped to the new payment link

3. **Environment Switching**: Create separate environments for:
   - Local development (`http://localhost:3000`)
   - Staging/Production (your deployed URL)

4. **Console Logging**: Open Postman Console (bottom left) to see detailed request/response logs and any test script output.

5. **Save Requests**: After successful tests, you can save example responses by clicking **Save Response** → **Save as Example**.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot POST /auth/login" | Check if API server is running and base_url is correct |
| 401 on login | Credentials expired - generate new ones via Telegram |
| 401 on dashboard endpoints | Token expired or invalid - login again |
| Empty payments array | No payments exist for this payment link yet |
| CORS errors | If testing from browser, ensure CORS is enabled in NestJS |

---

## API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/login` | No | Login with temporary credentials |
| POST | `/auth/logout` | No | Logout (client-side) |
| GET | `/dashboard/overview` | Yes (JWT) | Get payment link stats and recent payments |
| GET | `/dashboard/payments` | Yes (JWT) | Get paginated payments list |

---

## Security Notes

1. **Temporary Passwords**: Valid for 2 hours only
2. **Payment Link Scoping**: JWT token is scoped to specific payment link
3. **No Refresh Token**: Must generate new credentials via Telegram after expiration
4. **Session Tracking**: Each login is tracked with IP and User-Agent
5. **One Session Per Link**: Each dashboard session is tied to one payment link only

---

## Next Steps

After successful testing, you can:
1. Integrate these endpoints into your frontend dashboard
2. Add more test cases for edge cases
3. Set up automated API tests using Newman (Postman CLI)
4. Create monitoring/alerts for API health

---

**Need Help?**
- Check the [telegram.gateway.ts](src/telegram/telegram.gateway.ts) for bot command handling
- Review [dashboard-auth.service.ts](src/auth/dashboard-auth.service.ts) for authentication logic
- See [dashboard.service.ts](src/dashboard/dashboard.service.ts) for business logic
