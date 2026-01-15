# Frontend Payment Integration Guide

## Overview
This guide explains how to integrate payment links on your frontend and submit payment records to the backend after a blockchain transaction.

## Payment Flow

### 1. Get Payment Link Details
First, fetch the payment link details using the link code:

```javascript
// GET /payment-links/:linkCode
const response = await fetch(`/payment-links/${linkCode}`);
const paymentLink = await response.json();

// Response includes:
// {
//   linkId: "x7k9m2",
//   amount: 100,
//   token: "USDC",
//   chain: "solana",
//   recipientWalletAddress: "0x...",
//   customFields: [
//     { fieldName: "email", fieldType: "email", required: true },
//     { fieldName: "name", fieldType: "text", required: true }
//   ],
//   description: "Payment for service",
//   merchantId: { walletAddress: "0x...", wallets: [...] }
// }
```

### 2. Display Payment Form
Show the payment details and custom fields form to the user:

```javascript
// Display amount, token, and chain
console.log(`Pay ${paymentLink.amount} ${paymentLink.token} on ${paymentLink.chain}`);

// Render custom fields form
paymentLink.customFields.forEach(field => {
  // Render input for field.fieldName with type field.fieldType
  // Mark as required if field.required is true
});
```

### 3. Execute Blockchain Transaction
After the user fills the form and confirms, execute the blockchain transaction:

```javascript
// Example for Solana
const transaction = await createSolanaTransaction({
  from: userWalletAddress,
  to: paymentLink.recipientWalletAddress || paymentLink.merchantId.walletAddress,
  amount: paymentLink.amount,
  token: paymentLink.token,
  tokenMintAddress: '...' // USDC mint address
});

const signature = await wallet.signAndSendTransaction(transaction);

// Wait for confirmation (recommended)
await connection.confirmTransaction(signature);

// Get transaction details
const txDetails = await connection.getTransaction(signature);
```

### 4. Submit Payment to Backend
After the blockchain transaction succeeds, submit the payment record:

```javascript
// POST /payments
const paymentResponse = await fetch('/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    linkCode: paymentLink.linkId,              // Payment link code
    txSignature: signature,                    // Transaction signature/hash
    chain: paymentLink.chain,                  // "solana", "ethereum", etc.
    amount: paymentLink.amount,                // Amount paid
    token: paymentLink.token,                  // "USDC", "SOL", etc.
    tokenMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Optional
    fromAddress: userWalletAddress,            // Payer's wallet
    toAddress: recipientWalletAddress,         // Recipient wallet
    customerData: {                            // Custom fields data
      email: 'user@example.com',
      name: 'John Doe',
      // ... other custom fields
    },
    blockNumber: txDetails.blockNumber,        // For EVM chains (optional)
    slot: txDetails.slot,                      // For Solana (optional)
    isConfirmed: true,                         // Optional: defaults to true
    confirmations: 1,                          // Optional: number of confirmations
  })
});

const payment = await paymentResponse.json();
```

**Important:** By default, payments are marked as **"confirmed"** because the frontend only calls this endpoint AFTER the blockchain transaction succeeds. If you want to submit a pending payment (e.g., waiting for more confirmations), set `isConfirmed: false`.

### 5. Handle Response

```javascript
if (paymentResponse.ok) {
  // Success! Payment recorded
  console.log('Payment successful:', payment);

  // Show success message to user
  showSuccessMessage({
    paymentId: payment._id,
    txSignature: payment.txSignature,
    amount: payment.amount,
    token: payment.token,
    status: payment.status // "confirmed" by default (or "pending" if isConfirmed: false)
  });

  // Redirect to success page or show confirmation
  // Payment is already confirmed, no need to poll!

} else {
  // Handle error
  const error = await paymentResponse.json();
  console.error('Payment submission failed:', error);

  // Common errors:
  // - 409: Transaction already recorded (duplicate)
  // - 400: Invalid data (amount mismatch, wrong token, etc.)
  // - 404: Payment link not found or expired

  showErrorMessage(error.message);
}
```

## API Endpoint Details

### POST /payments

**Request Body:**
```typescript
{
  linkCode: string;              // Required: Payment link code
  txSignature: string;           // Required: Blockchain transaction hash
  chain: string;                 // Required: "solana", "ethereum", "base", etc.
  amount: number;                // Required: Amount paid (must match or exceed link amount)
  token: string;                 // Required: "USDC", "SOL", "ETH", etc. (must match link)
  tokenMintAddress?: string;     // Optional: Token contract/mint address
  fromAddress: string;           // Required: Payer's wallet address
  toAddress: string;             // Required: Recipient wallet address
  customerData?: object;         // Optional: Custom fields data (key-value pairs)
  blockNumber?: number;          // Optional: For EVM chains
  slot?: number;                 // Optional: For Solana
  isConfirmed?: boolean;         // Optional: Whether transaction is confirmed (default: true)
  confirmations?: number;        // Optional: Number of confirmations (default: 1 if confirmed)
}
```

**Response (Success - 201):**
```typescript
{
  _id: string;
  paymentLinkId: string;
  merchantId: string;
  txSignature: string;
  chain: string;
  amount: number;
  token: string;
  tokenMintAddress?: string;
  fromAddress: string;
  toAddress: string;
  customerData: object;
  status: "confirmed" | "pending" | "failed";  // "confirmed" by default
  confirmedAt?: Date;                          // Set when status is "confirmed"
  confirmations: number;                        // 1 by default if confirmed
  webhookSent: boolean;
  notificationSent: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses:**
- `400 Bad Request`: Invalid data, amount mismatch, token mismatch, chain mismatch
- `404 Not Found`: Payment link not found, expired, or already used (for single-use links)
- `409 Conflict`: Transaction signature already recorded (duplicate payment)

## Validation Rules

The backend validates:

1. **Payment Link**: Must exist, be active, and not expired
2. **Single-use Links**: Cannot be used more than once
3. **Amount**: Must be >= required amount on the payment link
4. **Token**: Must match exactly (case-insensitive)
5. **Chain**: Must match exactly (case-insensitive)
6. **Duplicate Prevention**: Same txSignature cannot be submitted twice

## Example: Complete React Component

```jsx
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

function PaymentLinkPage({ linkCode }) {
  const { publicKey, signTransaction } = useWallet();
  const [paymentLink, setPaymentLink] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // 1. Load payment link
  useEffect(() => {
    fetch(`/payment-links/${linkCode}`)
      .then(res => res.json())
      .then(setPaymentLink);
  }, [linkCode]);

  // 2. Handle payment
  const handlePay = async () => {
    setLoading(true);

    try {
      // Execute blockchain transaction
      const transaction = await createTransaction({
        from: publicKey.toString(),
        to: paymentLink.recipientWalletAddress,
        amount: paymentLink.amount,
        token: paymentLink.token,
      });

      const signature = await signTransaction(transaction);
      await connection.confirmTransaction(signature);

      // Submit to backend
      const response = await fetch('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkCode: paymentLink.linkId,
          txSignature: signature,
          chain: paymentLink.chain,
          amount: paymentLink.amount,
          token: paymentLink.token,
          fromAddress: publicKey.toString(),
          toAddress: paymentLink.recipientWalletAddress,
          customerData: formData,
        }),
      });

      if (response.ok) {
        const payment = await response.json();
        alert('Payment successful! Transaction: ' + payment.txSignature);
      } else {
        const error = await response.json();
        alert('Error: ' + error.message);
      }

    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!paymentLink) return <div>Loading...</div>;

  return (
    <div>
      <h1>Payment</h1>
      <p>Amount: {paymentLink.amount} {paymentLink.token}</p>
      <p>Chain: {paymentLink.chain}</p>

      {/* Render custom fields */}
      {paymentLink.customFields.map(field => (
        <input
          key={field.fieldName}
          type={field.fieldType}
          placeholder={field.fieldName}
          required={field.required}
          onChange={e => setFormData({
            ...formData,
            [field.fieldName]: e.target.value
          })}
        />
      ))}

      <button onClick={handlePay} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
}
```

## Payment Status Behavior

### Default: Confirmed Immediately
By default, when the frontend submits a payment, it's marked as **"confirmed"** because:
- The frontend only calls this endpoint AFTER the blockchain transaction succeeds
- The transaction has already been validated on-chain
- No need to wait for additional confirmations

```javascript
// Default behavior - payment is confirmed immediately
const response = await fetch('/payments', {
  method: 'POST',
  body: JSON.stringify({
    linkCode: "x7k9m2",
    txSignature: "5J7X...",
    // ... other fields
    // isConfirmed: true (default)
  })
});

const payment = await response.json();
console.log(payment.status); // "confirmed"
console.log(payment.confirmedAt); // timestamp
```

### Use Case: Pending Payments

If you want to submit a payment BEFORE it's fully confirmed (e.g., waiting for multiple confirmations), set `isConfirmed: false`:

```javascript
// Submit immediately after sending transaction (before confirmations)
const paymentResponse = await fetch('/payments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    linkCode: paymentLink.linkId,
    txSignature: signature,
    chain: paymentLink.chain,
    amount: paymentLink.amount,
    token: paymentLink.token,
    fromAddress: userWalletAddress,
    toAddress: recipientWalletAddress,
    customerData: formData,
    isConfirmed: false,  // Mark as pending
  })
});

// Then poll or use a background job to update it later
```

## Testing

Use the test script provided:
```bash
./test-endpoints.sh
```

Or test manually:
```bash
# Create confirmed payment (default)
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "linkCode": "x7k9m2",
    "txSignature": "5J7X...",
    "chain": "solana",
    "amount": 100,
    "token": "USDC",
    "fromAddress": "wallet1...",
    "toAddress": "wallet2...",
    "customerData": {
      "email": "test@example.com",
      "name": "Test User"
    }
  }'

# Create pending payment (waiting for confirmations)
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "linkCode": "x7k9m2",
    "txSignature": "5J7Y...",
    "chain": "solana",
    "amount": 100,
    "token": "USDC",
    "fromAddress": "wallet1...",
    "toAddress": "wallet2...",
    "isConfirmed": false
  }'
```

## Next Steps After Payment Submission

After submitting the payment successfully:

1. **Payment Status**: Marked as **"confirmed"** by default (or "pending" if `isConfirmed: false`)
2. **Transaction Record**: Automatically created and linked to the payment
3. **Payment Link Counter**: Incremented to track usage
4. **Single-use Links**: Can be deactivated after first successful payment
5. **Ready for Webhooks**: Payment is ready to trigger merchant notifications (when implemented)

## Recommended Features to Implement Next

### 1. **Webhook System** (High Priority)
Notify merchants when payments are confirmed:
- Store webhook URLs in Merchant schema
- Send POST requests with payment details to merchant's webhook URL
- Handle webhook retries on failure
- Add webhook signature verification for security
- Track webhook delivery status

### 2. **Customer Notifications** (High Priority)
Send receipts to customers:
- Email confirmations with transaction details
- SMS notifications (optional)
- Branded receipts from merchant
- Include payment link details and custom fields

### 3. **Payment Link Auto-deactivation**
For single-use links:
- Automatically deactivate after successful confirmed payment
- Prevent reuse of single-use links
- Update `isActive` to false when payment confirmed

### 4. **Success Page Redirects**
Enhance payment links with redirect URLs:
- Add `redirectUrl`/`successUrl` fields to payment link schema
- Redirect customers after successful payment
- Pass transaction details as query parameters
- Support custom success pages per merchant

### 5. **Background Confirmation Service** (For Pending Payments)
If using `isConfirmed: false`:
- Monitor blockchain for transaction confirmations
- Update payment status from "pending" → "confirmed"
- Trigger webhooks when fully confirmed
- Handle confirmation thresholds (1, 10, 32 confirmations, etc.)

### 6. **Payment Status Query Endpoint**
Allow frontend to check payment status:
- `GET /payments/tx/:txSignature` - Get payment by transaction signature
- `GET /payments/:paymentId` - Get payment by ID
- Useful for checking pending payments or showing payment history

## Summary

The payment creation flow is now complete:

✅ **Frontend submits payment** after blockchain transaction
✅ **Backend validates** payment link, amount, token, and chain
✅ **Payment marked as confirmed** by default (blockchain transaction already succeeded)
✅ **Transaction record created** and linked
✅ **Payment link counter updated**
✅ **Duplicate prevention** via transaction signature check

**Default behavior:** Payments are **"confirmed"** immediately since frontend only calls this endpoint after successful blockchain transaction. No polling needed!
