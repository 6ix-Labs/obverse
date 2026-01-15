# New Endpoint: Get Payments by Payment Link Code

## Overview
Added a new endpoint to fetch all payments associated with a specific payment link using the link code.

## Endpoint Details

### URL
```
GET /payments/link/:linkCode
```

### Parameters
- `linkCode` (path parameter) - The unique code of the payment link (6-20 characters)

### Response
Returns an array of payment documents, each containing:
- `paymentLinkId` - Reference to the payment link (populated)
- `merchantId` - Reference to the merchant
- `txSignature` - Transaction signature/hash
- `chain` - Blockchain chain (solana, ethereum, etc.)
- `amount` - Payment amount
- `token` - Token symbol (USDC, SOL, etc.)
- `tokenMintAddress` - Token contract/mint address
- `fromAddress` - Payer's wallet address
- `toAddress` - Recipient wallet address
- `customerData` - Custom fields submitted by the customer
- `status` - Payment status (pending, confirmed, failed)
- `confirmedAt` - Confirmation timestamp
- `confirmations` - Number of confirmations
- `blockNumber` / `slot` - Block information
- `webhookSent` - Whether webhook was sent
- `notificationSent` - Whether notification was sent
- `createdAt` / `updatedAt` - Timestamps

### Status Codes
- `200` - Success, returns array of payments (empty array if no payments yet)
- `400` - Bad Request
  - Empty link code
  - Invalid link code format (too short or too long)
- `404` - Not Found
  - Payment link does not exist
  - Payment link is inactive
  - Payment link has expired

### Example Usage

#### Request
```bash
curl http://localhost:4000/payments/link/abc12345
```

#### Success Response (200)
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "paymentLinkId": {
      "_id": "507f191e810c19729de860ea",
      "linkId": "abc12345",
      "amount": 100,
      "token": "USDC",
      "chain": "solana",
      "merchantId": "507f191e810c19729de860eb",
      "description": "Payment for services"
    },
    "merchantId": "507f191e810c19729de860eb",
    "txSignature": "5wHu1qwD7q5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5",
    "chain": "solana",
    "amount": 100,
    "token": "USDC",
    "fromAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "toAddress": "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV",
    "customerData": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "status": "confirmed",
    "confirmedAt": "2024-01-15T10:30:00.000Z",
    "confirmations": 32,
    "createdAt": "2024-01-15T10:25:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Error Response (400 - Invalid Format)
```json
{
  "statusCode": 400,
  "message": "Invalid payment link code format",
  "error": "Bad Request"
}
```

#### Error Response (404 - Not Found)
```json
{
  "statusCode": 404,
  "message": "Payment link not found",
  "error": "Not Found"
}
```

## Implementation Details

### Files Modified

1. **[src/payments/payments.controller.ts](src/payments/payments.controller.ts)**
   - Added new GET endpoint handler
   - Added validation for link code format
   - Added error handling and logging

2. **[src/payments/payments.service.ts](src/payments/payments.service.ts)**
   - Added `findByPaymentLinkCode()` method
   - Integrates with PaymentLinksService to validate link existence
   - Populates payment link data in response

3. **[src/payments/payments.module.ts](src/payments/payments.module.ts)**
   - Imported PaymentLinksModule to access PaymentLinksService

### Validation Rules

The endpoint validates:
1. Link code is not empty or whitespace
2. Link code is between 6-20 characters
3. Payment link exists and is active (via PaymentLinksService)
4. Payment link has not expired
5. For non-reusable links, checks usage status

## Testing

### E2E Tests Added
File: [test/endpoints.e2e-spec.ts](test/endpoints.e2e-spec.ts)

Added 4 test cases:
1. Returns 400 for empty link code
2. Returns 400 for too short link code (< 6 characters)
3. Returns 400 for too long link code (> 20 characters)
4. Returns 404 for non-existent link code

### Bash Test Script Updated
File: [test-endpoints.sh](test-endpoints.sh)

Added 4 test cases matching the E2E tests.

### Total Test Coverage
- **51 E2E tests** (increased from 47)
- **39 bash script tests** (increased from 35)

## Documentation Updated

Updated [TESTING.md](TESTING.md) with:
- New Payments section
- Endpoint documentation
- Updated test count

## Use Cases

This endpoint is useful for:

1. **Displaying payment history** - Show customers all payments made to a specific link
2. **Merchant dashboards** - Display payments received for each payment link
3. **Analytics** - Track payment conversion and success rates per link
4. **Reconciliation** - Match payments to specific payment links
5. **Customer support** - Verify payment status by link code

## Integration Notes

### Dependencies
- Requires PaymentLinksService to validate link existence
- Returns populated payment link data with each payment
- Sorted by creation date (newest first)

### Error Handling
- Inherits all validation from PaymentLinksService
- Handles expired links
- Handles inactive links
- Handles non-reusable links that have been used

### Performance Considerations
- Uses MongoDB indexing on `paymentLinkId` field
- Populates payment link data (single JOIN operation)
- No pagination (consider adding if links receive many payments)
