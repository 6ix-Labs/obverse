# Dashboard Payment Filters - Postman Testing Guide

This guide covers testing the **new filter functionality** for the `/dashboard/payments` endpoint.

## Prerequisites

Follow the main [POSTMAN-TESTING-GUIDE.md](POSTMAN-TESTING-GUIDE.md) to:
1. Set up Postman environment
2. Get temporary credentials from Telegram (`/dashboard` command)
3. Login to get JWT token

**Important**: You must be logged in and have a valid `access_token` before testing filters.

---

## New Filter Parameters

The `/dashboard/payments` endpoint now supports these **optional** filters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `token` | string | Filter by cryptocurrency token | `USDC`, `SOL`, `USDT`, `ETH` |
| `chain` | string | Filter by blockchain | `solana`, `ethereum`, `base`, `polygon`, `arbitrum` |
| `startDate` | string (ISO 8601) | Start of date range | `2024-01-01T00:00:00.000Z` |
| `endDate` | string (ISO 8601) | End of date range | `2024-12-31T23:59:59.999Z` |
| `limit` | number | Results per page (max 1000) | `50` (default) |
| `skip` | number | Offset for pagination | `0` (default) |

---

## Quick Test Examples

### 1. Filter by Token Only

**Request:**
```
GET {{base_url}}/dashboard/payments?token=USDC
```

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Expected Response:**
```json
{
  "payments": [
    {
      "_id": "65ghi789...",
      "paymentLinkId": "65def456...",
      "token": "USDC",
      "chain": "solana",
      "amount": 100,
      "status": "confirmed",
      "txSignature": "5KJH...",
      "fromAddress": "ABC123...",
      "toAddress": "XYZ789...",
      "createdAt": "2024-02-10T10:30:00.000Z",
      "confirmedAt": "2024-02-10T10:35:00.000Z"
    }
    // ... only USDC payments
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "skip": 0,
    "hasMore": false
  }
}
```

---

### 2. Filter by Chain Only

**Request:**
```
GET {{base_url}}/dashboard/payments?chain=solana
```

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Result:** Only payments on Solana blockchain

---

### 3. Filter by Date Range

**Request:**
```
GET {{base_url}}/dashboard/payments?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z
```

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Result:** Payments created in 2024 only

---

### 4. Filter by Token + Chain

**Request:**
```
GET {{base_url}}/dashboard/payments?token=USDC&chain=solana
```

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Result:** Only USDC payments on Solana

---

### 5. Filter by Token + Date Range

**Request:**
```
GET {{base_url}}/dashboard/payments?token=USDC&startDate=2024-02-01T00:00:00.000Z&endDate=2024-02-10T23:59:59.999Z
```

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Result:** USDC payments from Feb 1-10, 2024

---

### 6. All Filters Combined

**Request:**
```
GET {{base_url}}/dashboard/payments?token=USDC&chain=solana&startDate=2024-02-01T00:00:00.000Z&endDate=2024-02-10T23:59:59.999Z&limit=20&skip=0
```

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Result:** First 20 USDC payments on Solana from Feb 1-10, 2024

---

### 7. Pagination with Filters

**Request (Page 1):**
```
GET {{base_url}}/dashboard/payments?token=USDC&limit=10&skip=0
```

**Request (Page 2):**
```
GET {{base_url}}/dashboard/payments?token=USDC&limit=10&skip=10
```

**Request (Page 3):**
```
GET {{base_url}}/dashboard/payments?token=USDC&limit=10&skip=20
```

---

## Setting Up in Postman

### Option 1: Manual Setup (Quick)

1. **Open your existing "Get Payments" request** in Postman
2. **Go to the Params tab**
3. **Add these query parameters:**

   | Key | Value | Description |
   |-----|-------|-------------|
   | limit | `50` | Leave as default |
   | skip | `0` | Leave as default |
   | token | *(leave empty or add value)* | Optional: USDC, SOL, USDT, ETH |
   | chain | *(leave empty or add value)* | Optional: solana, ethereum, base, polygon, arbitrum |
   | startDate | *(leave empty or add value)* | Optional: 2024-01-01T00:00:00.000Z |
   | endDate | *(leave empty or add value)* | Optional: 2024-12-31T23:59:59.999Z |

4. **Uncheck parameters you don't want to use** - they're all optional!

### Option 2: Create Dedicated Requests

Create separate requests for common filter scenarios:

#### Request: "Filter Payments by Token"
```
GET {{base_url}}/dashboard/payments?token={{token_filter}}
```
Add variable: `token_filter` = `USDC`

#### Request: "Filter Payments by Chain"
```
GET {{base_url}}/dashboard/payments?chain={{chain_filter}}
```
Add variable: `chain_filter` = `solana`

#### Request: "Filter Payments by Date Range"
```
GET {{base_url}}/dashboard/payments?startDate={{start_date}}&endDate={{end_date}}
```
Add variables:
- `start_date` = `2024-01-01T00:00:00.000Z`
- `end_date` = `2024-12-31T23:59:59.999Z`

#### Request: "Filter Payments - All Filters"
```
GET {{base_url}}/dashboard/payments?token={{token_filter}}&chain={{chain_filter}}&startDate={{start_date}}&endDate={{end_date}}&limit={{limit}}&skip={{skip}}
```

---

## Testing Validation Errors

The API validates all inputs. Test these error scenarios:

### Test 1: Invalid Limit (Too High)

**Request:**
```
GET {{base_url}}/dashboard/payments?limit=5000
```

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Limit must be between 0 and 1000",
  "error": "Bad Request"
}
```

---

### Test 2: Invalid Limit (Negative)

**Request:**
```
GET {{base_url}}/dashboard/payments?limit=-10
```

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Limit must be between 0 and 1000",
  "error": "Bad Request"
}
```

---

### Test 3: Invalid Skip (Negative)

**Request:**
```
GET {{base_url}}/dashboard/payments?skip=-5
```

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Skip must be greater than or equal to 0",
  "error": "Bad Request"
}
```

---

### Test 4: Invalid Date Format

**Request:**
```
GET {{base_url}}/dashboard/payments?startDate=invalid-date
```

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Invalid start date format",
  "error": "Bad Request"
}
```

---

### Test 5: Start Date After End Date

**Request:**
```
GET {{base_url}}/dashboard/payments?startDate=2024-12-31T00:00:00.000Z&endDate=2024-01-01T00:00:00.000Z
```

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Start date must be before end date",
  "error": "Bad Request"
}
```

---

## Postman Collection JSON

You can import this collection to get pre-configured filter requests:

```json
{
  "info": {
    "name": "Dashboard Payments - Filter Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Filter by Token (USDC)",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/dashboard/payments?token=USDC",
          "host": ["{{base_url}}"],
          "path": ["dashboard", "payments"],
          "query": [
            {
              "key": "token",
              "value": "USDC"
            }
          ]
        }
      }
    },
    {
      "name": "Filter by Chain (Solana)",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/dashboard/payments?chain=solana",
          "host": ["{{base_url}}"],
          "path": ["dashboard", "payments"],
          "query": [
            {
              "key": "chain",
              "value": "solana"
            }
          ]
        }
      }
    },
    {
      "name": "Filter by Date Range (2024)",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/dashboard/payments?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z",
          "host": ["{{base_url}}"],
          "path": ["dashboard", "payments"],
          "query": [
            {
              "key": "startDate",
              "value": "2024-01-01T00:00:00.000Z"
            },
            {
              "key": "endDate",
              "value": "2024-12-31T23:59:59.999Z"
            }
          ]
        }
      }
    },
    {
      "name": "Filter - USDC on Solana",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/dashboard/payments?token=USDC&chain=solana",
          "host": ["{{base_url}}"],
          "path": ["dashboard", "payments"],
          "query": [
            {
              "key": "token",
              "value": "USDC"
            },
            {
              "key": "chain",
              "value": "solana"
            }
          ]
        }
      }
    },
    {
      "name": "Filter - All Combined",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/dashboard/payments?token=USDC&chain=solana&startDate=2024-02-01T00:00:00.000Z&endDate=2024-02-10T23:59:59.999Z&limit=20",
          "host": ["{{base_url}}"],
          "path": ["dashboard", "payments"],
          "query": [
            {
              "key": "token",
              "value": "USDC"
            },
            {
              "key": "chain",
              "value": "solana"
            },
            {
              "key": "startDate",
              "value": "2024-02-01T00:00:00.000Z"
            },
            {
              "key": "endDate",
              "value": "2024-02-10T23:59:59.999Z"
            },
            {
              "key": "limit",
              "value": "20"
            }
          ]
        }
      }
    }
  ]
}
```

**To Import:**
1. Copy the JSON above
2. Save to a file: `dashboard-filter-tests.json`
3. In Postman: **Import** → **Choose Files** → Select the file

---

## Complete Testing Checklist

- [ ] **Login** - Get valid JWT token
- [ ] **No Filters** - Test baseline (all payments)
- [ ] **Token Filter** - Test USDC, SOL, USDT, ETH
- [ ] **Chain Filter** - Test solana, ethereum, base, polygon, arbitrum
- [ ] **Date Range** - Test startDate only
- [ ] **Date Range** - Test endDate only
- [ ] **Date Range** - Test both startDate and endDate
- [ ] **Combined** - Token + Chain
- [ ] **Combined** - Token + Date Range
- [ ] **Combined** - Chain + Date Range
- [ ] **Combined** - All filters together
- [ ] **Pagination** - Test with filters (limit=10, skip=0, 10, 20)
- [ ] **Validation** - Test invalid limit (>1000, <0)
- [ ] **Validation** - Test invalid skip (<0)
- [ ] **Validation** - Test invalid date format
- [ ] **Validation** - Test startDate > endDate
- [ ] **Edge Cases** - Empty results (filter that matches nothing)
- [ ] **Edge Cases** - Single result
- [ ] **Performance** - Large limit (500-1000)

---

## Tips for Testing

### 1. Use Postman Variables for Common Values

Set these in your environment:
```
token_usdc    = USDC
token_sol     = SOL
chain_solana  = solana
chain_eth     = ethereum
date_2024_start = 2024-01-01T00:00:00.000Z
date_2024_end   = 2024-12-31T23:59:59.999Z
```

Then use in requests:
```
{{base_url}}/dashboard/payments?token={{token_usdc}}&chain={{chain_solana}}
```

### 2. Check Pagination Metadata

Always verify the `pagination` object:
- `total`: Should match your filter expectations
- `hasMore`: Should be `true` if more pages exist
- `limit` and `skip`: Should match your request

### 3. Verify Filter Logic

When combining filters, ensure **AND** logic:
- `token=USDC&chain=solana` → Returns USDC **AND** Solana (not USDC **OR** Solana)
- All filters must match for a payment to be included

### 4. Test Different Date Formats

ISO 8601 dates accept multiple formats:
```
2024-02-10T00:00:00.000Z    ✅ (Full ISO with timezone)
2024-02-10T00:00:00Z        ✅ (Without milliseconds)
2024-02-10                  ✅ (Date only, assumes 00:00:00)
2024-02-10 12:30:00         ❌ (Space separator - use T)
02/10/2024                  ❌ (US format - not ISO 8601)
```

### 5. Compare with /dashboard/overview

The overview endpoint shows total stats. Use it to validate:
- Total payment counts
- Token distribution
- Chain distribution

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty `payments` array | No payments match filters | Try broader filters or check data |
| `401 Unauthorized` | Token expired or missing | Login again to refresh token |
| `400 Bad Request` | Invalid parameter | Check error message for details |
| Wrong total count | Filter not working | Check MongoDB query in logs |
| Performance issues | Too many results | Use smaller `limit` or add filters |

---

## Next Steps

After testing filters in Postman:

1. **Integrate into Frontend** - Use these endpoints in your dashboard UI
2. **Add Filter UI** - Create dropdowns/date pickers for users
3. **Save Common Filters** - Let users save favorite filter combinations
4. **Export Functionality** - Add CSV export with filters applied
5. **Analytics** - Track which filters users use most

---

**Questions or Issues?**
- Check API logs for detailed error messages
- Review [dashboard.controller.ts](src/dashboard/dashboard.controller.ts) for validation logic
- See [payments.service.ts](src/payments/payments.service.ts) for query implementation
