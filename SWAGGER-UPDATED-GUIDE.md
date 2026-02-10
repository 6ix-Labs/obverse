# Updated Swagger API Documentation Guide

## 🎉 New Features Added to Dashboard Payments Endpoint

The `/dashboard/payments` endpoint has been enhanced with **filters** and **search** functionality. All changes are automatically reflected in the Swagger UI documentation.

---

## 📍 Accessing Swagger Documentation

### Local Development
```
http://localhost:4000/api-docs
```

### Production (if deployed)
```
https://your-domain.com/api-docs
```

---

## 🆕 Updated Endpoint: GET /dashboard/payments

### What's New

The endpoint now supports **7 query parameters** (all optional):

| Parameter | Type | Added | Description | Example |
|-----------|------|-------|-------------|---------|
| `limit` | number | ✅ Existing | Max results (0-1000) | `50` |
| `skip` | number | ✅ Existing | Offset for pagination | `0` |
| `token` | string | 🆕 **NEW** | Filter by cryptocurrency token | `USDC` |
| `chain` | string | 🆕 **NEW** | Filter by blockchain | `solana` |
| `startDate` | string | 🆕 **NEW** | Start of date range (ISO 8601) | `2024-01-01T00:00:00.000Z` |
| `endDate` | string | 🆕 **NEW** | End of date range (ISO 8601) | `2024-12-31T23:59:59.999Z` |
| `search` | string | 🆕 **NEW** | Search across multiple fields | `ABC123` |

---

## 📖 How to View in Swagger UI

### Step 1: Start Your Server
```bash
npm run start:dev
```

Wait for the message:
```
Swagger documentation available at: http://localhost:4000/api-docs
```

### Step 2: Open Swagger UI
Open your browser and navigate to:
```
http://localhost:4000/api-docs
```

### Step 3: Find the Dashboard Section
1. Scroll down to the **"dashboard"** tag section
2. Look for **GET /dashboard/payments**
3. Click to expand the endpoint

### Step 4: View New Parameters
You'll see all 7 parameters documented:

**Pagination:**
- `limit` - Number of payments to return (max 1000) [Default: 50]
- `skip` - Number of payments to skip [Default: 0]

**Filters:**
- `token` - Filter by token (USDC, SOL, USDT, ETH, etc.)
- `chain` - Filter by blockchain chain (dropdown with: solana, ethereum, base, polygon, arbitrum)
- `startDate` - Start date filter (ISO 8601)
- `endDate` - End date filter (ISO 8601)

**Search:**
- `search` - Search across transaction signatures, wallet addresses, customer data, and amounts

---

## 🧪 Testing in Swagger UI

### Step 1: Authenticate

1. **Get JWT Token** first by:
   - Using Telegram bot (`/dashboard` command)
   - Call **POST /auth/login** in Swagger
   - Copy the `accessToken` from response

2. **Click "Authorize" button** (top right of Swagger UI)
   - Paste your JWT token: `Bearer YOUR_TOKEN_HERE`
   - Click "Authorize"
   - Click "Close"

### Step 2: Test the Endpoint

1. **Expand GET /dashboard/payments**
2. **Click "Try it out"** button
3. **Fill in parameters** you want to test:

**Example 1: Filter by Token**
```
token: USDC
limit: 10
skip: 0
```

**Example 2: Filter by Token + Chain**
```
token: USDC
chain: solana
limit: 20
```

**Example 3: Date Range Filter**
```
startDate: 2024-01-01T00:00:00.000Z
endDate: 2024-12-31T23:59:59.999Z
limit: 50
```

**Example 4: Search**
```
search: john
limit: 10
```

**Example 5: Search + Filter Combined**
```
token: USDC
chain: solana
search: alice
limit: 10
```

4. **Click "Execute"** button

5. **View Response:**
   - **Code**: 200 (success)
   - **Response body**: JSON with payments array and pagination
   - **Response headers**: Content-Type, etc.

---

## 📊 Updated Response Schema

### Success Response (200 OK)

```json
{
  "payments": [
    {
      "_id": "65abc123...",
      "paymentLinkId": "65def456...",
      "merchantId": "65ghi789...",
      "token": "USDC",
      "chain": "solana",
      "amount": 100,
      "txSignature": "5KJHabc123xyz...",
      "fromAddress": "ABC123...",
      "toAddress": "XYZ789...",
      "status": "confirmed",
      "customerData": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2024-02-10T10:30:00.000Z",
      "confirmedAt": "2024-02-10T10:35:00.000Z",
      "confirmations": 32
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "skip": 0,
    "hasMore": false
  }
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```
**Cause:** Missing or invalid JWT token

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Limit must be between 0 and 1000",
  "error": "Bad Request"
}
```
**Causes:**
- Invalid limit (< 0 or > 1000)
- Invalid skip (< 0)
- Invalid date format
- Start date after end date

---

## 🎯 Interactive Testing Examples in Swagger

### Test 1: No Filters (Baseline)
```
Parameters:
  (leave all empty or use defaults)

Expected:
  All payments for the payment link
```

### Test 2: Token Filter
```
Parameters:
  token: USDC
  limit: 10

Expected:
  First 10 USDC payments
```

### Test 3: Chain Filter
```
Parameters:
  chain: solana
  limit: 10

Expected:
  First 10 Solana payments
```

### Test 4: Date Range
```
Parameters:
  startDate: 2024-01-01T00:00:00.000Z
  endDate: 2024-01-31T23:59:59.999Z

Expected:
  All payments from January 2024
```

### Test 5: Combined Filters
```
Parameters:
  token: USDC
  chain: solana
  limit: 20

Expected:
  First 20 USDC payments on Solana
```

### Test 6: Search by Transaction
```
Parameters:
  search: 5KJH
  limit: 10

Expected:
  Payments with "5KJH" in transaction signature
```

### Test 7: Search by Wallet
```
Parameters:
  search: 0xABC

Expected:
  Payments from/to wallets containing "0xABC"
```

### Test 8: Search by Customer
```
Parameters:
  search: john

Expected:
  Payments with "john" in customer data
```

### Test 9: Search + Filter
```
Parameters:
  token: USDC
  search: alice
  limit: 10

Expected:
  USDC payments related to "alice"
```

### Test 10: All Parameters Combined
```
Parameters:
  token: USDC
  chain: solana
  startDate: 2024-01-01T00:00:00.000Z
  endDate: 2024-12-31T23:59:59.999Z
  search: john
  limit: 10
  skip: 0

Expected:
  First 10 USDC payments on Solana from 2024 containing "john"
```

---

## 🔍 Swagger UI Features

### 1. Schema Documentation
Click on "Schema" tab to see the full data models:
- Payment model structure
- Pagination metadata
- Error response formats

### 2. Try It Out
Interactive testing directly in the browser:
- No need for Postman
- Fill in parameters
- Execute requests
- View responses

### 3. Download OpenAPI Spec
Get the OpenAPI 3.0 specification:
- Click on `/api-docs-json` link
- Or visit: `http://localhost:4000/api-docs-json`
- Import into other tools (Postman, Insomnia, etc.)

### 4. Code Generation
Swagger UI shows example `curl` commands:
- Click "Execute"
- Scroll to "Curl" section
- Copy command for terminal use

---

## 📝 Parameter Details in Swagger

### Token Parameter (`token`)
```yaml
name: token
in: query
required: false
schema:
  type: string
description: Filter by token (USDC, SOL, USDT, ETH, etc.)
example: USDC
```

### Chain Parameter (`chain`)
```yaml
name: chain
in: query
required: false
schema:
  type: string
  enum:
    - solana
    - ethereum
    - base
    - polygon
    - arbitrum
description: Filter by blockchain chain
example: solana
```

### Start Date Parameter (`startDate`)
```yaml
name: startDate
in: query
required: false
schema:
  type: string
description: Start date filter (ISO 8601)
example: 2024-01-01T00:00:00.000Z
```

### End Date Parameter (`endDate`)
```yaml
name: endDate
in: query
required: false
schema:
  type: string
description: End date filter (ISO 8601)
example: 2024-12-31T23:59:59.999Z
```

### Search Parameter (`search`)
```yaml
name: search
in: query
required: false
schema:
  type: string
description: Search across transaction signatures, wallet addresses, customer data, and amounts
example: ABC123
```

---

## 🚀 Quick Start Checklist

- [ ] Start server: `npm run start:dev`
- [ ] Open Swagger: `http://localhost:4000/api-docs`
- [ ] Get JWT token via Telegram `/dashboard` command
- [ ] Login via Swagger: POST /auth/login
- [ ] Copy `accessToken` from response
- [ ] Click "Authorize" button in Swagger
- [ ] Paste token: `Bearer YOUR_TOKEN`
- [ ] Navigate to GET /dashboard/payments
- [ ] Click "Try it out"
- [ ] Test with different parameter combinations
- [ ] View responses and verify results

---

## 📚 Additional Swagger Endpoints

Other dashboard endpoints also available:

### GET /dashboard/overview
Get payment link statistics and recent payments
- No parameters
- Requires JWT authentication
- Returns stats, recent payments, and chart data

### POST /auth/login
Get JWT token for authentication
- Body: `{ "identifier": "...", "password": "..." }`
- Returns: `accessToken` and merchant info

### POST /auth/logout
Logout from current session
- Requires JWT authentication
- Clears session

---

## 🔧 Swagger Configuration

The Swagger documentation is configured in `src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Obverse API')
  .setDescription('API documentation for Obverse payment platform')
  .setVersion('1.0')
  .addTag('dashboard', 'Dashboard endpoints')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .build();
```

---

## 💡 Tips for Using Swagger

### 1. Persist Authentication
Once you authorize, the token persists for the session
- No need to re-authorize for each request
- Token expires after 2 hours

### 2. Parameter Validation
Swagger validates parameters before sending:
- Type checking (number, string, etc.)
- Enum validation (chain dropdown)
- Required vs optional fields

### 3. Response Examples
Swagger shows example responses:
- Success response structure
- Error response formats
- Schema definitions

### 4. Export Requests
Copy `curl` commands from Swagger:
- Test in terminal
- Share with team
- Document API usage

### 5. Model Schemas
View complete data models:
- Click on model names in responses
- See all fields and types
- Understand data structure

---

## 🎨 Swagger UI Screenshot Guide

When you open Swagger, you'll see:

1. **Header**: API title and description
2. **Tags**: Grouped by category (auth, dashboard, etc.)
3. **Endpoints**: Expandable endpoint list
4. **Try It Out**: Interactive testing button
5. **Parameters**: Input fields for query params
6. **Execute**: Send request button
7. **Response**: JSON response viewer

---

## ✅ Verification Steps

After viewing Swagger docs:

1. **Verify all 7 parameters are listed**
   - limit, skip, token, chain, startDate, endDate, search

2. **Check parameter descriptions**
   - Each should have clear description
   - Examples provided
   - Type specified

3. **Test authorization**
   - Click "Authorize"
   - Paste JWT token
   - Should see lock icon change

4. **Execute test request**
   - Fill in one parameter
   - Click "Execute"
   - Should get 200 OK response

5. **Verify response format**
   - payments array
   - pagination metadata
   - All fields present

---

## 🌐 Accessing from Different Environments

### Local Development
```
http://localhost:4000/api-docs
```

### Docker Container
```
http://localhost:4000/api-docs
# (Port mapping may vary)
```

### Staging Environment
```
https://staging.yourdomain.com/api-docs
```

### Production Environment
```
https://api.yourdomain.com/api-docs
```

---

## 📖 Related Documentation

- **[POSTMAN-FILTER-TESTING-GUIDE.md](POSTMAN-FILTER-TESTING-GUIDE.md)** - Postman testing guide
- **[SEARCH-FUNCTIONALITY-GUIDE.md](SEARCH-FUNCTIONALITY-GUIDE.md)** - Search feature details
- **[postman-filter-quick-tests.txt](postman-filter-quick-tests.txt)** - Quick test commands

---

## 🎉 Summary

✅ Swagger UI is automatically updated with all new parameters
✅ Interactive testing available at `/api-docs`
✅ All 7 parameters (filters + search) documented
✅ Complete request/response examples provided
✅ JWT authentication integrated
✅ Ready to test immediately!

**Quick Access:**
```bash
npm run start:dev
# Then open: http://localhost:4000/api-docs
```

Happy testing! 🚀
