# Telegram /balance Command

## Overview
The `/balance` command allows merchants to check their wallet balances across all configured chains directly from the Telegram bot.

## Features

### Supported Chains
- ✅ **Solana** - Native SOL balance
- ✅ **Ethereum** - Native ETH balance
- ✅ **Polygon** - Native MATIC balance
- ✅ **Arbitrum** - Native ETH balance
- ✅ **Base** - Native ETH balance

### What It Shows
- Wallet address (masked for security)
- Native token balance (SOL, ETH, MATIC, etc.)
- Chain name and wallet label
- Active wallet status

## Usage

### Command
```
/balance
```

### Example Output
```
💰 Wallet Balances

📍 Solana (Main Wallet)
`9xQeWvG7...Xv7Kkp`
💵 Balance: 2.5432 SOL

📍 Ethereum (ETH Wallet)
`0x742d35...75Aa`
💵 Balance: 1.2345 ETH

📍 Polygon (Polygon Wallet)
`0x8f3c12...6bC8`
💵 Balance: 150.0000 MATIC

🔄 Use /balance to refresh
```

## Implementation Details

### Files Created/Modified

1. **[src/telegram/handlers/balance.handler.ts](src/telegram/handlers/balance.handler.ts)** - New balance handler
   - Fetches Solana balances using `@solana/web3.js`
   - Fetches EVM balances using JSON-RPC calls (no external dependencies)
   - Handles errors gracefully per wallet

2. **[src/telegram/telegram.module.ts](src/telegram/telegram.module.ts:14,43)** - Added BalanceHandler to providers

3. **[src/telegram/telegram.gateway.ts](src/telegram/telegram.gateway.ts:11,29,123-131)** - Registered `/balance` command

4. **[src/telegram/handlers/help.handler.ts](src/telegram/handlers/help.handler.ts:12-14)** - Updated help message

### How It Works

**Solana Balance:**
- Uses `@solana/web3.js` Connection
- Calls `getBalance()` for native SOL
- Connects to `https://api.mainnet-beta.solana.com` (configurable via `SOLANA_RPC_URL`)

**EVM Balance (Ethereum, Polygon, Arbitrum, Base):**
- Uses native `fetch` API for JSON-RPC calls
- Calls `eth_getBalance` method
- Converts hex wei to decimal ETH/MATIC
- Uses public RPC endpoints:
  - Ethereum: `https://eth.llamarpc.com`
  - Polygon: `https://polygon-rpc.com`
  - Arbitrum: `https://arb1.arbitrum.io/rpc`
  - Base: `https://mainnet.base.org`

### Error Handling
- If a wallet fails to fetch balance, shows "❌ Failed to fetch balance"
- Logs error details for debugging
- Continues checking other wallets
- Only shows active wallets (`isActive: true`)

## Future Enhancements (Optional)

### 1. Token Balances
Uncomment the SPL/ERC20 token balance methods to show:
- USDC balance on Solana
- USDC/USDT balances on EVM chains

**Example implementation included in comments:**
- `getSolanaTokenBalance()` - for SPL tokens
- `getERC20Balance()` - for ERC20 tokens

### 2. USD Value
Add price feeds (e.g., CoinGecko API) to show USD equivalent:
```
💵 Balance: 2.5432 SOL ($250.32)
```

### 3. Refresh Button
Add inline keyboard button to refresh without typing `/balance`:
```javascript
const keyboard = {
  inline_keyboard: [[
    { text: '🔄 Refresh', callback_data: 'refresh_balance' }
  ]]
};
```

### 4. Historical Balance Tracking
Store balance snapshots over time to show:
- Balance changes
- Portfolio growth
- Charts/graphs

### 5. Transaction Count
Show number of transactions for each wallet:
```
💵 Balance: 2.5432 SOL
📊 Transactions: 42
```

## Configuration

### RPC Endpoints
You can customize RPC endpoints by modifying the `rpcUrls` object in [balance.handler.ts](src/telegram/handlers/balance.handler.ts:11-16):

```typescript
private rpcUrls = {
  ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
  polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
};
```

### Solana RPC
Set in environment variables:
```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Testing

1. Start the bot: `npm run start:dev`
2. In Telegram, send `/balance`
3. Bot will fetch and display all wallet balances

**Prerequisites:**
- User must have completed `/start` setup
- User must have configured at least one wallet via `/wallet`

## Dependencies

- ✅ `@solana/web3.js` - Already installed
- ✅ Native `fetch` API - Built into Node.js 18+
- ❌ No additional packages needed!

## Security Notes

- Wallet addresses are masked in output (shows first 8 and last 8 characters)
- Uses public RPC endpoints (free but rate-limited)
- No private keys are exposed or stored
- Balance checks are read-only operations

## Performance

- Fetches balances in sequence (not parallel)
- Each RPC call takes ~100-500ms
- Total time: ~1-3 seconds for 3-5 wallets
- Consider adding caching for frequent checks

## Summary

✅ `/balance` command fully implemented
✅ Supports 5 blockchains (Solana + 4 EVM chains)
✅ No external dependencies (uses native fetch)
✅ Error handling per wallet
✅ Updated help command
✅ Ready to use!

Users can now check their wallet balances anytime with a simple `/balance` command! 💰
