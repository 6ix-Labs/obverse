# Monad Blockchain Integration

This document describes the Monad blockchain integration in the Obverse payment system.

## Overview

Monad is a high-performance, EVM-compatible blockchain with:
- **10,000 TPS** throughput
- **400ms** block time
- **800ms** finality
- Full Ethereum compatibility (Cancun fork)

## Network Details

### Mainnet
- **Chain ID:** 143
- **Native Currency:** MON
- **RPC Endpoint:** `https://rpc.monad.xyz`
- **WebSocket:** `wss://rpc.monad.xyz`
- **Block Explorer:** https://monadvision.com

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Monad Configuration
MONAD_RPC_URL=https://rpc.monad.xyz
MONAD_USDC_ADDRESS=  # USDC contract address on Monad (to be added when deployed)
```

### Supported Chains

The system now supports:
- `solana` - Solana blockchain (default for backward compatibility)
- `monad` - Monad blockchain (EVM-compatible)

### Supported Tokens

#### Solana
- `SOL` - Native Solana token
- `USDC` - USD Coin
- `USDT` - Tether USD

#### Monad
- `MON` - Native Monad token
- `USDC` - USD Coin (contract address required)

## API Usage

### Creating Payment Links

You can now specify `monad` as the chain when creating payment links:

```bash
POST /payment-links
{
  "amount": 10,
  "token": "MON",
  "chain": "monad",
  "description": "Payment for services",
  "isReusable": false
}
```

### Checking Balances

Get balance for Monad chain:

```bash
GET /wallet/:userId/balance?chain=monad
```

### Example: Create Monad Payment Link

```javascript
const paymentLink = await fetch('/payment-links', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    amount: 5,
    token: 'MON',
    chain: 'monad',
    description: 'Test payment',
    isReusable: true
  })
});
```

## Architecture

### New Components

1. **Chain Configuration** (`src/blockchain/config/chains.config.ts`)
   - Centralized chain and token configuration
   - Helper functions for validation and lookup

2. **EVM Service** (`src/blockchain/services/evm.service.ts`)
   - Handles all EVM chain interactions (Monad, Ethereum, etc.)
   - Balance checking
   - Transaction monitoring
   - Gas estimation

3. **Chain Validator** (`src/blockchain/validators/chain.validator.ts`)
   - Validates chains and tokens
   - Enforces minimum amounts
   - Ensures data integrity

### Updated Components

1. **Balance Service** (`src/wallet/services/balance.service.ts`)
   - Now supports both Solana and EVM chains
   - Automatic chain detection
   - Unified balance response format

2. **Payment Links Service** (`src/payment-links/payment-links.service.ts`)
   - Validates chains using ChainValidator
   - Supports all configured chains and tokens

3. **Blockchain Module** (`src/blockchain/blockchain.module.ts`)
   - Exports EvmService for use across the application

## Minimum Payment Amounts

### Native Tokens (MON, SOL, ETH)
- Minimum: **0.0001**

### Stablecoins (USDC)
- Minimum: **0.005**

## Transaction Flow

1. **Payment Link Creation**
   - Validate chain and token
   - Check minimum amounts
   - Store payment link with chain info

2. **Payment Processing**
   - Detect chain from payment link
   - Use appropriate service (Solana or EVM)
   - Monitor transaction confirmation

3. **Balance Checking**
   - Route to Solana or EVM service based on chain
   - Fetch native and token balances
   - Return unified format

## Testing

### Test Monad Integration

1. Create a payment link for Monad:
```bash
curl -X POST http://localhost:3000/payment-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 1,
    "token": "MON",
    "chain": "monad",
    "description": "Test Monad payment",
    "isReusable": true
  }'
```

2. Check balance on Monad:
```bash
curl http://localhost:3000/wallet/123456789/balance?chain=monad \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Future Enhancements

- [ ] Add transaction monitoring via WebSocket
- [ ] Implement gas optimization strategies
- [ ] Add support for more ERC-20 tokens
- [ ] Create webhook notifications for Monad transactions
- [ ] Add Monad testnet support
- [ ] Implement account abstraction features

## Troubleshooting

### Common Issues

1. **"Unsupported chain" error**
   - Ensure chain name is lowercase: `monad`, not `Monad`
   - Check that chain is configured in `chains.config.ts`

2. **Token not found error**
   - Verify token symbol is correct
   - Ensure token is configured for the specified chain
   - Check if token contract address is set in environment variables

3. **RPC connection errors**
   - Verify MONAD_RPC_URL in .env
   - Check network connectivity
   - Try alternative RPC endpoints (rpc1, rpc2, rpc3)

## Resources

- [Monad Documentation](https://docs.monad.xyz)
- [Monad Block Explorer](https://monadvision.com)
- [Network Information](https://docs.monad.xyz/developer-essentials/network-information)
