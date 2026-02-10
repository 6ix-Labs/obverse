# Dashboard Payments Search Functionality

## Overview

The `/dashboard/payments` endpoint now includes a powerful search feature that allows you to search across multiple fields simultaneously.

## Search Parameter

**Parameter:** `search` (optional, string)

**Description:** Search across transaction signatures, wallet addresses, customer data, and payment amounts

**Example:** `?search=ABC123`

---

## What Fields Are Searched?

The search functionality looks across these fields:

### 1. Transaction Signature (`txSignature`)
- Searches for partial matches in the blockchain transaction ID
- Case-insensitive
- Example: `search=5KJH` will find transactions with signatures like "5KJHabc123..."

### 2. Wallet Addresses
Searches in both:
- `fromAddress` - The sender's wallet address
- `toAddress` - The recipient's wallet address
- Case-insensitive partial matching
- Example: `search=0xABC` will find addresses like "0xABC123xyz..."

### 3. Customer Data
- Searches within all custom customer fields (name, email, phone, etc.)
- Looks through values in the `customerData` object
- Case-insensitive partial matching
- Example: `search=john` will find customer data containing "john" in any field

### 4. Payment Amount
- Exact match for numeric amounts
- Example: `search=100` will find payments with amount exactly 100
- Example: `search=50.5` will find payments with amount exactly 50.5

---

## How Search Works

### OR Logic
When you use the search parameter, it finds payments that match **ANY** of these conditions:
- Transaction signature contains the search term
- OR sender address contains the search term
- OR recipient address contains the search term
- OR amount equals the search term (if numeric)
- OR any customer data field contains the search term

### Combined with Filters
Search works **together** with other filters using **AND** logic:
- All filters must match (token, chain, dates)
- AND at least one search field must match

**Example:**
```
?token=USDC&search=john
```
Returns payments where:
- Token is USDC **AND**
- (Transaction contains "john" OR wallet contains "john" OR customer data contains "john")

---

## API Examples

### Basic Search Examples

#### Search by Transaction Signature
```bash
GET /dashboard/payments?search=5KJHabc123
```
Finds payments with transaction signatures containing "5KJHabc123"

#### Search by Wallet Address
```bash
GET /dashboard/payments?search=0xABC123
```
Finds payments where sender or recipient address contains "0xABC123"

#### Search by Customer Name
```bash
GET /dashboard/payments?search=john
```
Finds payments with "john" in customer data (name, email, etc.)

#### Search by Amount
```bash
GET /dashboard/payments?search=100
```
Finds payments with exactly 100 as the amount

---

### Combined Search + Filter Examples

#### Search + Token Filter
```bash
GET /dashboard/payments?token=USDC&search=john
```
Find USDC payments related to "john"

#### Search + Chain Filter
```bash
GET /dashboard/payments?chain=solana&search=ABC123
```
Find Solana payments with "ABC123" in transaction or addresses

#### Search + Date Range
```bash
GET /dashboard/payments?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z&search=alice
```
Find payments in 2024 related to "alice"

#### Search + Multiple Filters
```bash
GET /dashboard/payments?token=USDC&chain=solana&search=0xABC&limit=10
```
Find first 10 USDC payments on Solana containing "0xABC" in addresses

---

## Postman Testing

### Test 1: Search by Transaction Signature

**Request:**
```
GET {{base_url}}/dashboard/payments?search=5KJH
Authorization: Bearer {{access_token}}
```

**Expected:** Returns payments with "5KJH" in transaction signature

---

### Test 2: Search by Wallet Address

**Request:**
```
GET {{base_url}}/dashboard/payments?search=0xABC
Authorization: Bearer {{access_token}}
```

**Expected:** Returns payments where sender or recipient address contains "0xABC"

---

### Test 3: Search by Customer Name

**Request:**
```
GET {{base_url}}/dashboard/payments?search=john
Authorization: Bearer {{access_token}}
```

**Expected:** Returns payments with "john" in customer data

---

### Test 4: Search by Amount

**Request:**
```
GET {{base_url}}/dashboard/payments?search=100
Authorization: Bearer {{access_token}}
```

**Expected:** Returns payments with exactly 100 as the amount

---

### Test 5: Search + Filter Combined

**Request:**
```
GET {{base_url}}/dashboard/payments?token=USDC&search=alice
Authorization: Bearer {{access_token}}
```

**Expected:** Returns USDC payments containing "alice" in any searchable field

---

### Test 6: Search with Pagination

**Request:**
```
GET {{base_url}}/dashboard/payments?search=john&limit=10&skip=0
Authorization: Bearer {{access_token}}
```

**Expected:** First 10 payments matching "john"

---

## Response Format

Responses follow the same format as regular filtered queries:

```json
{
  "payments": [
    {
      "_id": "65abc123...",
      "paymentLinkId": "65def456...",
      "token": "USDC",
      "chain": "solana",
      "amount": 100,
      "txSignature": "5KJHabc123xyz...",  ← Matched search term
      "fromAddress": "ABC123...",
      "toAddress": "XYZ789...",
      "customerData": {
        "name": "John Doe",  ← Matched search term
        "email": "john@example.com"
      },
      "status": "confirmed",
      "createdAt": "2024-02-10T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "skip": 0,
    "hasMore": false
  }
}
```

---

## Search Tips

### 1. Case Sensitivity
Search is **case-insensitive** for all text fields
- `search=ABC` matches "abc", "ABC", "Abc"
- `search=john` matches "John", "JOHN", "john"

### 2. Partial Matching
Search finds **partial matches** in text fields
- `search=ABC` finds "ABC123xyz"
- `search=john` finds "john.doe@email.com"

### 3. Numeric Search
For amounts, search requires **exact match**
- `search=100` finds amount = 100
- `search=100` does NOT find amount = 100.5
- `search=50.5` finds amount = 50.5

### 4. Special Characters
Special regex characters should be escaped:
- `.` → Use `\.` if you need exact match
- `*` → Use `\*` if you need exact match
- Most searches will work without escaping

### 5. Empty Search
If `search` parameter is empty or just whitespace, it's ignored
- `?search=` → No search applied
- `?search=   ` → No search applied (trimmed)

---

## Performance Considerations

### Indexes
Search uses MongoDB's `$regex` which:
- Works efficiently for prefix searches
- Can be slower for middle/suffix searches
- Consider adding text indexes for very large datasets

### Optimization Tips
1. **Combine with filters** to narrow results before searching
   ```
   ?token=USDC&chain=solana&search=ABC
   ```
   Better than just: `?search=ABC`

2. **Use specific searches** when possible
   - `search=5KJH1234567` (specific) is faster than `search=5K`

3. **Limit results** to improve response time
   ```
   ?search=john&limit=20
   ```

---

## Advanced Examples

### Search for a Specific User's Payments
```bash
GET /dashboard/payments?search=alice@email.com
```
Finds all payments with this email in customer data

### Find Test Transactions
```bash
GET /dashboard/payments?search=test
```
Finds transactions with "test" in signature, addresses, or customer data

### Search by Partial Wallet
```bash
GET /dashboard/payments?search=0x1234
```
Finds all payments from/to wallets starting with "0x1234"

### Find Specific Amount Range (using multiple requests)
```bash
# Request 1: Amount = 100
GET /dashboard/payments?search=100

# Request 2: Amount = 150
GET /dashboard/payments?search=150

# Request 3: Amount = 200
GET /dashboard/payments?search=200
```

---

## Comparison with Filters

| Feature | Filters | Search |
|---------|---------|--------|
| Token | Exact match | N/A |
| Chain | Exact match | N/A |
| Date Range | Range match | N/A |
| Transaction Signature | N/A | Partial match |
| Wallet Addresses | N/A | Partial match |
| Customer Data | N/A | Partial match |
| Amount | N/A | Exact match |
| Logic | AND (all must match) | OR (any must match) |
| Case Sensitivity | Exact | Insensitive |

**Best Practice:** Use filters to narrow down by type/chain/date, then use search to find specific transactions/users

---

## Troubleshooting

### No Results When Expected

**Issue:** Search returns empty array but you know the data exists

**Solutions:**
1. Check case - Search is case-insensitive but verify the term
2. Verify the payment belongs to the current payment link
3. Check if combined filters are too restrictive
4. Try a shorter search term (e.g., "ABC" instead of "ABC123XYZ")

### Too Many Results

**Issue:** Search returns too many irrelevant results

**Solutions:**
1. Use more specific search terms
2. Add filters: `?token=USDC&search=...`
3. Reduce limit: `?search=...&limit=10`

### Search Not Working for Amount

**Issue:** Searching for "100" doesn't find a payment with amount 100

**Solutions:**
1. Verify the amount is exactly 100 (not 100.00 or 100.5)
2. Check if payment exists: Try without search first
3. Amount search requires numeric input

### Slow Response

**Issue:** Search takes too long to respond

**Solutions:**
1. Add filters to narrow results: `?chain=solana&search=...`
2. Use smaller limit: `?search=...&limit=20`
3. Use more specific search terms
4. Consider adding database indexes for frequently searched fields

---

## Implementation Details

### MongoDB Query Structure

When you use search, the query looks like this:

```javascript
{
  paymentLinkId: "65def456...",  // Always scoped to payment link
  token: "USDC",                  // Optional filter
  chain: "solana",                // Optional filter
  $or: [                          // Search across multiple fields
    { txSignature: { $regex: "search_term", $options: "i" } },
    { fromAddress: { $regex: "search_term", $options: "i" } },
    { toAddress: { $regex: "search_term", $options: "i" } },
    { amount: 100 },              // If search term is numeric
    { /* customerData search */ }
  ]
}
```

### Search Priority

All search fields have equal priority. The query returns payments matching ANY of the search criteria.

---

## Future Enhancements

Potential improvements to consider:

1. **Full-Text Search**
   - MongoDB text indexes
   - Better performance for large datasets
   - Relevance scoring

2. **Search Highlighting**
   - Return which field matched
   - Highlight matched text

3. **Fuzzy Matching**
   - Find similar terms
   - Handle typos

4. **Search History**
   - Save recent searches
   - Suggest common searches

5. **Field-Specific Search**
   - `?searchAddress=0xABC`
   - `?searchTx=5KJH`
   - More precise targeting

---

## Summary

✅ **Search across**: Transaction signatures, wallet addresses, customer data, amounts
✅ **Match type**: Partial match (case-insensitive) for text, exact match for numbers
✅ **Combines with**: All existing filters (token, chain, dates)
✅ **Logic**: OR within search fields, AND with other filters
✅ **Performance**: Optimized with MongoDB regex and compound queries

**Quick Start:**
```bash
# Simple search
GET /dashboard/payments?search=john

# Search + filters
GET /dashboard/payments?token=USDC&search=john&limit=10
```

Happy searching! 🔍
