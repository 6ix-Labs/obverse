import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
  getChainConfig,
  getTokenConfig,
  ChainType,
  getSupportedTokensForChain,
} from '../config/chains.config';

export interface EvmBalance {
  nativeBalance: string; // in wei
  nativeBalanceFormatted: string; // in ETH/MON
  tokens: Array<{
    symbol: string;
    balance: string;
    balanceFormatted: string;
    decimals: number;
    address?: string;
  }>;
}

export interface EvmTransactionParams {
  from: string;
  to: string;
  value?: string; // in wei for native currency
  data?: string; // for contract calls
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

@Injectable()
export class EvmService {
  private readonly logger = new Logger(EvmService.name);
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private activeRpcIndex: Map<string, number> = new Map();

  // Standard ERC-20 ABI (minimal)
  private readonly ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
  ];

  private getProviderKey(chain: string, rpcUrl: string): string {
    return `${chain}:${rpcUrl}`;
  }

  private getOrCreateProvider(
    chain: string,
    rpcUrl: string,
    chainId?: number,
    chainName?: string,
  ): ethers.JsonRpcProvider {
    const key = this.getProviderKey(chain, rpcUrl);
    const cached = this.providers.get(key);
    if (cached) {
      return cached;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl, {
      chainId,
      name: chainName,
    });
    this.providers.set(key, provider);
    return provider;
  }

  private getRpcCandidates(
    chain: string,
    rpcUrls: string[],
  ): Array<{ url: string; index: number }> {
    const activeIndex = this.activeRpcIndex.get(chain) ?? 0;
    const validActiveIndex =
      activeIndex >= 0 && activeIndex < rpcUrls.length ? activeIndex : 0;

    const orderedIndexes = [
      validActiveIndex,
      ...rpcUrls.map((_, idx) => idx).filter((idx) => idx !== validActiveIndex),
    ];

    return orderedIndexes.map((index) => ({ url: rpcUrls[index], index }));
  }

  private async withRpcFallback<T>(
    chain: string,
    operation: string,
    callback: (provider: ethers.JsonRpcProvider) => Promise<T>,
  ): Promise<T> {
    const chainLower = chain.toLowerCase();
    const chainConfig = getChainConfig(chainLower);

    if (chainConfig.chainType === ChainType.SOLANA) {
      throw new Error(
        'EVM service does not support Solana. Use Solana service instead.',
      );
    }

    const candidates = this.getRpcCandidates(chainLower, chainConfig.rpcUrls);
    let lastError: unknown = null;

    for (const candidate of candidates) {
      const provider = this.getOrCreateProvider(
        chainLower,
        candidate.url,
        chainConfig.chainId,
        chainConfig.name,
      );

      try {
        const result = await callback(provider);
        if (this.activeRpcIndex.get(chainLower) !== candidate.index) {
          this.activeRpcIndex.set(chainLower, candidate.index);
          this.logger.warn(
            `Switched ${chainConfig.name} RPC to ${candidate.url}`,
          );
        }
        return result;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `${operation} failed on ${chainConfig.name} RPC ${candidate.url}: ${message}`,
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`All RPC endpoints failed for ${chainConfig.name}`);
  }

  /**
   * Get or create provider for a chain
   */
  getProvider(chain: string): ethers.JsonRpcProvider {
    const chainLower = chain.toLowerCase();
    const chainConfig = getChainConfig(chainLower);
    if (chainConfig.chainType === ChainType.SOLANA) {
      throw new Error(
        'EVM service does not support Solana. Use Solana service instead.',
      );
    }

    const activeIndex = this.activeRpcIndex.get(chainLower) ?? 0;
    const index =
      activeIndex >= 0 && activeIndex < chainConfig.rpcUrls.length
        ? activeIndex
        : 0;

    return this.getOrCreateProvider(
      chainLower,
      chainConfig.rpcUrls[index],
      chainConfig.chainId,
      chainConfig.name,
    );
  }

  /**
   * Get native balance (MON, ETH, etc.) for an address
   */
  async getNativeBalance(
    chain: string,
    address: string,
  ): Promise<{
    balance: string;
    balanceFormatted: string;
  }> {
    try {
      const balance = await this.withRpcFallback(
        chain,
        'getNativeBalance',
        (provider) => provider.getBalance(address),
      );

      return {
        balance: balance.toString(),
        balanceFormatted: ethers.formatEther(balance),
      };
    } catch (error) {
      this.logger.error(
        `Error getting native balance for ${address} on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get ERC-20 token balance for an address
   */
  async getTokenBalance(
    chain: string,
    tokenAddress: string,
    walletAddress: string,
  ): Promise<{
    balance: string;
    balanceFormatted: string;
    decimals: number;
    symbol: string;
  }> {
    try {
      const { balance, decimals, symbol } = await this.withRpcFallback(
        chain,
        'getTokenBalance',
        async (provider) => {
          const contract = new ethers.Contract(
            tokenAddress,
            this.ERC20_ABI,
            provider,
          );
          const [balance, decimals, symbol] = await Promise.all([
            contract.balanceOf(walletAddress),
            contract.decimals(),
            contract.symbol(),
          ]);
          return { balance, decimals, symbol };
        },
      );

      return {
        balance: balance.toString(),
        balanceFormatted: ethers.formatUnits(balance, decimals),
        decimals: Number(decimals),
        symbol,
      };
    } catch (error) {
      this.logger.error(
        `Error getting token balance for ${walletAddress} on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get comprehensive balance (native + all configured tokens)
   */
  async getBalance(chain: string, address: string): Promise<EvmBalance> {
    try {
      getChainConfig(chain);

      // Get native balance
      const nativeBalance = await this.getNativeBalance(chain, address);

      // Get token balances from configured chain tokens
      const tokens: EvmBalance['tokens'] = [];
      const tokenSymbols = getSupportedTokensForChain(chain);

      for (const symbol of tokenSymbols) {
        try {
          const tokenConfig = getTokenConfig(chain, symbol);
          if (tokenConfig.address && !tokenConfig.isNative) {
            const tokenBalance = await this.getTokenBalance(
              chain,
              tokenConfig.address,
              address,
            );

            tokens.push({
              symbol: tokenBalance.symbol,
              balance: tokenBalance.balance,
              balanceFormatted: tokenBalance.balanceFormatted,
              decimals: tokenBalance.decimals,
              address: tokenConfig.address,
            });
          }
        } catch (error) {
          // Token might not be deployed yet, skip
          this.logger.debug(`Token ${symbol} not available on ${chain}`);
        }
      }

      return {
        nativeBalance: nativeBalance.balance,
        nativeBalanceFormatted: nativeBalance.balanceFormatted,
        tokens,
      };
    } catch (error) {
      this.logger.error(
        `Error getting balance for ${address} on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    chain: string,
    txParams: EvmTransactionParams,
  ): Promise<bigint> {
    try {
      const gasEstimate = await this.withRpcFallback(
        chain,
        'estimateGas',
        (provider) =>
          provider.estimateGas({
            from: txParams.from,
            to: txParams.to,
            value: txParams.value ? BigInt(txParams.value) : undefined,
            data: txParams.data,
          }),
      );

      return gasEstimate;
    } catch (error) {
      this.logger.error(
        `Error estimating gas on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(chain: string): Promise<{
    gasPrice: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  }> {
    try {
      const feeData = await this.withRpcFallback(
        chain,
        'getGasPrice',
        (provider) => provider.getFeeData(),
      );

      return {
        gasPrice: feeData.gasPrice || 0n,
        maxFeePerGas: feeData.maxFeePerGas || undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error getting gas price on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(chain: string, txHash: string) {
    try {
      return await this.withRpcFallback(chain, 'getTransaction', (provider) =>
        provider.getTransaction(txHash),
      );
    } catch (error) {
      this.logger.error(
        `Error getting transaction ${txHash} on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(chain: string, txHash: string) {
    try {
      return await this.withRpcFallback(
        chain,
        'getTransactionReceipt',
        (provider) => provider.getTransactionReceipt(txHash),
      );
    } catch (error) {
      this.logger.error(
        `Error getting transaction receipt ${txHash} on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    chain: string,
    txHash: string,
    confirmations: number = 1,
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.withRpcFallback(
        chain,
        'waitForTransaction',
        (provider) => provider.waitForTransaction(txHash, confirmations),
      );
    } catch (error) {
      this.logger.error(
        `Error waiting for transaction ${txHash} on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(chain: string): Promise<number> {
    try {
      return await this.withRpcFallback(chain, 'getBlockNumber', (provider) =>
        provider.getBlockNumber(),
      );
    } catch (error) {
      this.logger.error(
        `Error getting block number on ${chain}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Parse units (convert from human readable to wei)
   */
  parseUnits(value: string, decimals: number): bigint {
    return ethers.parseUnits(value, decimals);
  }

  /**
   * Format units (convert from wei to human readable)
   */
  formatUnits(value: bigint | string, decimals: number): string {
    return ethers.formatUnits(value, decimals);
  }
}
