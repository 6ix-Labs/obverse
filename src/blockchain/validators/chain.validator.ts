import { BadRequestException } from '@nestjs/common';
import {
  isChainSupported,
  isTokenSupported,
  getSupportedChains,
  getSupportedTokensForChain,
  getTokenConfig,
} from '../config/chains.config';

export class ChainValidator {
  /**
   * Validate that a chain is supported
   */
  static validateChain(chain: string): void {
    if (!chain || chain.trim().length === 0) {
      throw new BadRequestException('Chain is required');
    }

    if (!isChainSupported(chain)) {
      const supportedChains = getSupportedChains();
      throw new BadRequestException(
        `Unsupported chain: ${chain}. Supported chains: ${supportedChains.join(', ')}`,
      );
    }
  }

  /**
   * Validate that a token is supported on a given chain
   */
  static validateToken(chain: string, token: string): void {
    if (!token || token.trim().length === 0) {
      throw new BadRequestException('Token is required');
    }

    // First validate the chain
    this.validateChain(chain);

    // Then validate the token for this chain
    if (!isTokenSupported(chain, token)) {
      const supportedTokens = getSupportedTokensForChain(chain);
      throw new BadRequestException(
        `Token ${token} is not supported on ${chain}. Supported tokens: ${supportedTokens.join(', ')}`,
      );
    }
  }

  /**
   * Validate minimum amount based on token type and chain
   */
  static validateMinimumAmount(
    chain: string,
    token: string,
    amount: number,
  ): void {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      const tokenConfig = getTokenConfig(chain, token);

      // Set minimum amounts based on token decimals
      // Stablecoins (6 decimals): minimum 0.005
      // Native tokens (9 or 18 decimals): smaller minimum
      let minimumAmount = 0.005;

      if (tokenConfig.isNative) {
        // For native tokens (SOL, MON, ETH), allow smaller amounts
        minimumAmount = 0.0001;
      } else if (tokenConfig.decimals === 6) {
        // For stablecoins with 6 decimals
        minimumAmount = 0.005;
      }

      if (amount < minimumAmount) {
        throw new BadRequestException(
          `Minimum amount for ${token} on ${chain} is ${minimumAmount}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // If we can't get token config, use default validation
      throw new BadRequestException(
        `Unable to validate amount for ${token} on ${chain}`,
      );
    }
  }

  /**
   * Validate complete payment link data
   */
  static validatePaymentLinkData(data: {
    chain: string;
    token: string;
    amount: number;
  }): void {
    this.validateChain(data.chain);
    this.validateToken(data.chain, data.token);
    this.validateMinimumAmount(data.chain, data.token, data.amount);
  }
}
