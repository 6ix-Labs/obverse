# Multi-Chain Architecture (M0)

Status: Locked for Base rollout (Feb 27, 2026)

## Objective
Ship Base mainnet now, while making future EVM chains (Ethereum, Arbitrum, Polygon, etc.) mostly config-driven.

## Core design decisions

### 1) Chain registry is source of truth
All supported chains must be declared in a single registry:
- `chain key` (e.g. `solana`, `monad`, `base`)
- `chainId` (for EVM chains)
- `chainType`
- `rpcUrls` (ordered failover list)
- `wsUrls` (optional)
- `nativeCurrency` metadata
- `blockExplorerUrls`
- `isTestnet`

Current implementation path:
- `src/blockchain/config/chains.config.ts`

### 2) Token registry is chain-scoped
Tokens are declared per chain with:
- `symbol`
- `name`
- `decimals`
- `address` (only for contract tokens)
- `isNative`

Important:
- Same symbol can exist on many chains (e.g. `USDC`).
- Runtime always resolves token by `(chain, symbol)`.

### 3) Runtime behavior must be config-driven
Business logic should avoid hardcoded chain branching beyond protocol family routing (`solana` vs `evm`).

- EVM balance/tx behavior must rely on chain registry for provider and fallback.
- Validation must rely on central chain/token registries.
- Explorer URLs must be derived from chain config, not hardcoded network names.

### 4) Wallet strategy
- One Solana address for Solana.
- One EVM address reused across all EVM chains.
- Merchant `wallets[]` stores per-chain entries for UX and explicit routing.

## Non-goals in M0
- No schema rewrite.
- No chain-specific custom business flow.
- No protocol expansion beyond existing Solana + EVM split.

## New chain onboarding checklist (future)
1. Add chain entry in registry.
2. Add token entries in token registry.
3. Add env keys in `.env.example`.
4. Ensure DTO/Swagger chain values are aligned.
5. Add/verify explorer URL generation.
6. Add unit + integration coverage for the new chain.
7. Run staging smoke tests (link creation, payment ingest, dashboard filter).

## Base rollout notes
- Base chain key: `base`
- Base chain id: `8453`
- Native token: `ETH`
- Stablecoin token: `USDC` (official Circle contract on Base)
