# Minimum Payment Amounts

## Overview

Obverse enforces minimum payment amounts to ensure transactions are economically viable considering blockchain transaction fees.

## Minimum Amounts by Token

### Stablecoins (USDC, USDT, BUSD, DAI, TUSD)
```
Minimum: 0.005
```

**Examples:**
- ✅ 0.005 USDC - Valid
- ✅ 0.01 USDC - Valid
- ✅ 1.00 USDC - Valid
- ✅ 50.00 USDC - Valid
- ❌ 0.004 USDC - Invalid (below minimum)
- ❌ 0.001 USDC - Invalid (below minimum)

### SOL (Solana Native Token)
```
Minimum: > 0 (any positive amount)
```

**Examples:**
- ✅ 0.000001 SOL - Valid
- ✅ 0.001 SOL - Valid
- ✅ 0.1 SOL - Valid
- ✅ 1.0 SOL - Valid
- ❌ 0 SOL - Invalid (must be greater than 0)
- ❌ -0.5 SOL - Invalid (negative amount)

### Other Tokens (ETH, BNB, MATIC, etc.)
```
Minimum: > 0 (any positive amount)
```

No specific minimum enforced, but must be greater than 0.

## Implementation

### Backend Validation

**Location:** [src/payment-links/payment-links.service.ts](src/payment-links/payment-links.service.ts#L43-L57)

```typescript
// Basic validation
if (!data.amount || data.amount <= 0) {
  throw new BadRequestException('Amount must be greater than 0');
}

// Minimum amount for stablecoins
const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD'];
if (stablecoins.includes(data.token.toUpperCase()) && data.amount < 0.005) {
  throw new BadRequestException(
    `Minimum amount for ${data.token} is 0.005`,
  );
}
```

### Telegram Bot Validation

**Location:** [src/telegram/handlers/create-link.handler.ts](src/telegram/handlers/create-link.handler.ts#L108-L119)

```typescript
// Basic validation
if (amount <= 0) {
  await ctx.reply(`❌ Amount must be greater than 0`);
  return;
}

// Validate minimum amount for stablecoins
const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD'];
if (stablecoins.includes(token) && amount < 0.005) {
  await ctx.reply(`❌ Minimum amount for ${token} is 0.005`);
  return;
}
```

## Error Messages

### API Error Response

**Stablecoin below minimum:**
```json
{
  "statusCode": 400,
  "message": "Minimum amount for USDC is 0.005",
  "error": "Bad Request"
}
```

**Zero or negative amount:**
```json
{
  "statusCode": 400,
  "message": "Amount must be greater than 0",
  "error": "Bad Request"
}
```

### Telegram Bot Error Messages

**Stablecoin below minimum:**
```
❌ Minimum amount for USDC is 0.005
```

**Zero or negative amount:**
```
❌ Amount must be greater than 0
```

## Why These Minimums?

### Stablecoins (0.005 minimum)

**Reason:** Transaction fees and practicality
- Solana transaction fees: ~$0.00025 per transaction
- A 0.005 USDC minimum ensures fees don't consume a significant portion
- Provides a reasonable floor for micropayments

**Example cost analysis:**
- Payment: 0.005 USDC
- Fee: ~0.00025 USDC (5% of payment)
- Merchant receives: ~0.00475 USDC (95%)

### SOL (any amount > 0)

**Reason:** Flexibility for testing and micropayments
- SOL has very low transaction fees
- Native token transfers are cheaper than SPL tokens
- Allows maximum flexibility for developers and users

## Testing Minimum Amounts

### Test with API

```bash
# Valid: Above minimum
curl -X POST http://localhost:4000/payment-links \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "507f1f77bcf86cd799439011",
    "amount": 0.005,
    "token": "USDC",
    "chain": "solana"
  }'

# Invalid: Below minimum
curl -X POST http://localhost:4000/payment-links \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "507f1f77bcf86cd799439011",
    "amount": 0.004,
    "token": "USDC",
    "chain": "solana"
  }'
# Response: {"statusCode":400,"message":"Minimum amount for USDC is 0.005"}
```

### Test with Telegram Bot

1. Start payment link creation: `/payment`
2. Try different amounts:
   - `0.004 USDC` → ❌ Error: "Minimum amount for USDC is 0.005"
   - `0.005 USDC` → ✅ Accepted
   - `0.001 SOL` → ✅ Accepted (SOL has no minimum except > 0)

## Updating Minimum Amounts

### To Change Stablecoin Minimum

**Edit:** [src/payment-links/payment-links.service.ts](src/payment-links/payment-links.service.ts#L52-L57)

```typescript
// Change 0.005 to your desired minimum
if (stablecoins.includes(data.token.toUpperCase()) && data.amount < 0.01) {
  throw new BadRequestException(
    `Minimum amount for ${data.token} is 0.01`,
  );
}
```

**Also edit:** [src/telegram/handlers/create-link.handler.ts](src/telegram/handlers/create-link.handler.ts#L114-L119)

### To Add More Tokens to Minimum List

**Add token to the stablecoins array:**

```typescript
const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD', 'EUROC', 'PYUSD'];
```

### To Add Chain-Specific Minimums

**Example: Ethereum tokens need higher minimums due to gas:**

```typescript
// Minimum amount validation
const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD'];
const isStablecoin = stablecoins.includes(data.token.toUpperCase());

if (data.chain === 'ethereum') {
  // Ethereum has high gas fees
  if (data.amount < 5.0) {
    throw new BadRequestException(
      `Minimum amount for Ethereum is 5.0 ${data.token} due to gas fees`,
    );
  }
} else if (isStablecoin && data.amount < 0.005) {
  // Other chains with stablecoins
  throw new BadRequestException(
    `Minimum amount for ${data.token} is 0.005`,
  );
}
```

## Frontend Integration

Your frontend should also validate minimum amounts before sending to API:

### JavaScript/TypeScript Example

```typescript
function validatePaymentAmount(amount: number, token: string, chain: string): string | null {
  // Must be positive
  if (amount <= 0) {
    return 'Amount must be greater than 0';
  }

  // Stablecoin minimum
  const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD'];
  if (stablecoins.includes(token.toUpperCase()) && amount < 0.005) {
    return `Minimum amount for ${token} is 0.005`;
  }

  return null; // Valid
}

// Usage
const error = validatePaymentAmount(0.004, 'USDC', 'solana');
if (error) {
  alert(error); // "Minimum amount for USDC is 0.005"
}
```

### React Example

```typescript
const PaymentLinkForm = () => {
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [error, setError] = useState('');

  const handleAmountChange = (value: string) => {
    setAmount(value);

    const numAmount = parseFloat(value);
    const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD'];

    if (stablecoins.includes(token) && numAmount < 0.005) {
      setError(`Minimum amount for ${token} is 0.005`);
    } else if (numAmount <= 0) {
      setError('Amount must be greater than 0');
    } else {
      setError('');
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => handleAmountChange(e.target.value)}
        min="0.005"
        step="0.001"
      />
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

## Summary

| Token Type | Minimum Amount | Reason |
|------------|----------------|--------|
| USDC, USDT, BUSD, DAI, TUSD | **0.005** | Transaction fees make smaller amounts impractical |
| SOL | **> 0** (any positive) | Low fees allow micropayments |
| ETH, BNB, MATIC, etc. | **> 0** (any positive) | No enforced minimum (consider gas fees) |

## Recommended Best Practices

1. **For Production:**
   - Consider higher minimums on expensive chains (Ethereum: $5+)
   - Keep Solana minimums low (0.005 is good)
   - Update minimums as gas prices change

2. **For Testing:**
   - Use test networks (devnet, testnet)
   - Current minimums work well for development

3. **User Experience:**
   - Show minimum amounts in your UI
   - Explain why minimums exist (transaction fees)
   - Suggest appropriate amounts for each chain

---

**Last Updated:** February 5, 2026
**Status:** ✅ Implemented and Tested
**Build Status:** ✅ Successful