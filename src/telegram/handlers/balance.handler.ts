import { Injectable, Logger } from '@nestjs/common';
import { MerchantService } from '../../merchants/merchants.service';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getChainConfig } from '../../blockchain/config/chains.config';

@Injectable()
export class BalanceHandler {
  private readonly logger = new Logger(BalanceHandler.name);
  private solanaConnection: Connection;

  constructor(private merchantsService: MerchantService) {
    // Initialize Solana connection (you can make this configurable)
    this.solanaConnection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );
  }

  async handle(ctx: any) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) {
      await ctx.reply(`⚠️ Please set up your account with /start`);
      return;
    }

    if (!merchant.wallets || merchant.wallets.length === 0) {
      await ctx.reply(
        `⚠️ No wallets configured yet.\n\n` +
          `Please add a wallet using /wallet first.`,
      );
      return;
    }

    await ctx.reply('🔄 Fetching balances...');

    try {
      let message = `💰 Wallet Balances\n\n`;

      for (const wallet of merchant.wallets) {
        if (!wallet.isActive) continue;

        const chainName =
          wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1);
        message += `📍 ${chainName} (${wallet.label || 'Wallet'})\n`;
        message += `\`${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}\`\n`;

        try {
          if (wallet.chain === 'solana') {
            const balance = await this.getSolanaBalance(wallet.address);
            message += `💵 Balance: ${balance.sol.toFixed(4)} SOL\n`;

            // You can add USDC balance here if needed
            // const usdcBalance = await this.getSolanaTokenBalance(wallet.address, USDC_MINT);
            // message += `💵 USDC: ${usdcBalance.toFixed(2)}\n`;
          } else {
            // EVM chains
            const balance = await this.getEVMBalance(
              wallet.address,
              wallet.chain,
            );
            const symbol = this.getNativeSymbol(wallet.chain);
            message += `💵 Balance: ${balance} ${symbol}\n`;
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch balance for ${wallet.chain}: ${error.message}`,
          );
          message += `❌ Failed to fetch balance\n`;
        }

        message += `\n`;
      }

      message += `\n🔄 Use /balance to refresh`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error(
        `Error fetching balances: ${error.message}`,
        error.stack,
      );
      await ctx.reply('❌ Failed to fetch balances. Please try again later.');
    }
  }

  private async getSolanaBalance(address: string): Promise<{ sol: number }> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.solanaConnection.getBalance(publicKey);

      return {
        sol: balance / LAMPORTS_PER_SOL,
      };
    } catch (error) {
      this.logger.error(`Error fetching Solana balance: ${error.message}`);
      throw error;
    }
  }

  // Optional: Get SPL token balance (e.g., USDC on Solana)
  // private async getSolanaTokenBalance(walletAddress: string, tokenMint: string): Promise<number> {
  //   try {
  //     const walletPubkey = new PublicKey(walletAddress);
  //     const mintPubkey = new PublicKey(tokenMint);
  //
  //     const tokenAccounts = await this.solanaConnection.getTokenAccountsByOwner(
  //       walletPubkey,
  //       { mint: mintPubkey }
  //     );
  //
  //     if (tokenAccounts.value.length === 0) {
  //       return 0;
  //     }
  //
  //     const balance = await this.solanaConnection.getTokenAccountBalance(
  //       tokenAccounts.value[0].pubkey
  //     );
  //
  //     return parseFloat(balance.value.uiAmount?.toString() || '0');
  //   } catch (error) {
  //     this.logger.error(`Error fetching Solana token balance: ${error.message}`);
  //     return 0;
  //   }
  // }

  private async getEVMBalance(address: string, chain: string): Promise<string> {
    try {
      const rpcUrl = this.getRpcUrl(chain);

      // Make JSON-RPC request to get balance
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Convert hex balance to decimal (wei)
      const balanceWei = BigInt(data.result);

      // Convert wei to ether (divide by 10^18)
      const balanceEth = Number(balanceWei) / 1e18;

      return balanceEth.toFixed(4);
    } catch (error) {
      this.logger.error(`Error fetching ${chain} balance: ${error.message}`);
      throw error;
    }
  }

  // Optional: Get ERC20 token balance
  // private async getERC20Balance(
  //   walletAddress: string,
  //   tokenAddress: string,
  //   chain: string
  // ): Promise<number> {
  //   try {
  //     const rpcUrl = this.getRpcUrl(chain);
  //
  //     // ERC20 balanceOf function signature
  //     const functionSignature = '0x70a08231'; // keccak256('balanceOf(address)')
  //     const paddedAddress = walletAddress.slice(2).padStart(64, '0');
  //     const data = functionSignature + paddedAddress;
  //
  //     const response = await fetch(rpcUrl, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         jsonrpc: '2.0',
  //         method: 'eth_call',
  //         params: [
  //           {
  //             to: tokenAddress,
  //             data: data,
  //           },
  //           'latest',
  //         ],
  //         id: 1,
  //       }),
  //     });
  //
  //     const result = await response.json();
  //
  //     if (result.error) {
  //       throw new Error(result.error.message);
  //     }
  //
  //     const balanceHex = result.result;
  //     const balance = BigInt(balanceHex);
  //
  //     // Most tokens use 6 or 18 decimals - you'd need to fetch this separately
  //     // For USDC it's 6 decimals
  //     return Number(balance) / 1e6;
  //   } catch (error) {
  //     this.logger.error(`Error fetching ERC20 balance: ${error.message}`);
  //     return 0;
  //   }
  // }

  private getRpcUrl(chain: string): string {
    return getChainConfig(chain).rpcUrls[0];
  }

  private getNativeSymbol(chain: string): string {
    return getChainConfig(chain).nativeCurrency.symbol;
  }
}
