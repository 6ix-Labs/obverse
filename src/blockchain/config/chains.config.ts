// Chain configurations for all supported blockchains

export enum ChainType {
  SOLANA = 'solana',
  MONAD = 'monad',
  BASE = 'base',
}

export interface ChainConfig {
  chainId?: number;
  chainType: ChainType;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  wsUrls?: string[];
  blockExplorerUrls: string[];
  transactionExplorerUrl?: string;
  isTestnet: boolean;
}

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  address?: string; // Contract address for ERC-20 tokens (undefined for native tokens)
  chain: ChainType;
  isNative: boolean;
}

// Chain configurations
export const CHAINS: Record<string, ChainConfig> = {
  solana: {
    chainType: ChainType.SOLANA,
    name: 'Solana Mainnet',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrls: [
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    ],
    blockExplorerUrls: ['https://solscan.io'],
    transactionExplorerUrl: 'https://solscan.io/tx',
    isTestnet: false,
  },
  monad: {
    chainId: 143,
    chainType: ChainType.MONAD,
    name: 'Monad Mainnet',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18,
    },
    rpcUrls: [
      process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz',
      'https://rpc1.monad.xyz',
      'https://rpc2.monad.xyz',
      'https://rpc3.monad.xyz',
    ],
    wsUrls: ['wss://rpc.monad.xyz'],
    blockExplorerUrls: ['https://monadvision.com', 'https://monadscan.com'],
    transactionExplorerUrl: 'https://monadscan.com/tx',
    isTestnet: false,
  },
  base: {
    chainId: 8453,
    chainType: ChainType.BASE,
    name: 'Base Mainnet',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      'https://base-rpc.publicnode.com',
      'https://base.llamarpc.com',
    ],
    wsUrls: [process.env.BASE_WS_URL || 'wss://base-rpc.publicnode.com'],
    blockExplorerUrls: ['https://basescan.org', 'https://base.blockscout.com'],
    transactionExplorerUrl: 'https://basescan.org/tx',
    isTestnet: false,
  },
};

// Token configurations for each chain
export const TOKENS: Record<string, TokenConfig[]> = {
  solana: [
    {
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      chain: ChainType.SOLANA,
      isNative: true,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      chain: ChainType.SOLANA,
      isNative: false,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      chain: ChainType.SOLANA,
      isNative: false,
    },
  ],
  monad: [
    {
      symbol: 'MON',
      name: 'Monad',
      decimals: 18,
      chain: ChainType.MONAD,
      isNative: true,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      // Official Circle USDC on Monad Mainnet
      address:
        process.env.MONAD_USDC_ADDRESS ||
        '0x754704bc059f8c67012fed69bc8a327a5aafb603',
      chain: ChainType.MONAD,
      isNative: false,
    },
  ],
  base: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chain: ChainType.BASE,
      isNative: true,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      // Official Circle USDC on Base Mainnet
      address:
        process.env.BASE_USDC_ADDRESS ||
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      chain: ChainType.BASE,
      isNative: false,
    },
  ],
};

// Helper functions
export function getChainConfig(chain: string): ChainConfig {
  const config = CHAINS[chain.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return config;
}

export function getTokenConfig(
  chain: string,
  tokenSymbol: string,
): TokenConfig {
  const chainTokens = TOKENS[chain.toLowerCase()];
  if (!chainTokens) {
    throw new Error(`No tokens configured for chain: ${chain}`);
  }

  const token = chainTokens.find(
    (t) => t.symbol.toLowerCase() === tokenSymbol.toLowerCase(),
  );
  if (!token) {
    throw new Error(`Token ${tokenSymbol} not found on chain ${chain}`);
  }

  return token;
}

export function getSupportedChains(): string[] {
  return Object.keys(CHAINS);
}

export function getSupportedTokensForChain(chain: string): string[] {
  const chainTokens = TOKENS[chain.toLowerCase()];
  if (!chainTokens) {
    return [];
  }
  return chainTokens.map((t) => t.symbol);
}

export function isChainSupported(chain: string): boolean {
  return chain.toLowerCase() in CHAINS;
}

export function isTokenSupported(chain: string, token: string): boolean {
  const chainTokens = TOKENS[chain.toLowerCase()];
  if (!chainTokens) {
    return false;
  }
  return chainTokens.some(
    (t) => t.symbol.toLowerCase() === token.toLowerCase(),
  );
}

export function getTransactionExplorerUrl(
  chain: string,
  txHash: string,
): string {
  const config = getChainConfig(chain);
  const configuredBase = config.transactionExplorerUrl;
  const fallbackBase = `${config.blockExplorerUrls[0].replace(/\/$/, '')}/tx`;
  const explorerBase = (configuredBase || fallbackBase).replace(/\/$/, '');
  return `${explorerBase}/${txHash}`;
}
