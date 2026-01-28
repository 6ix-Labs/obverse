import { Injectable, Logger } from '@nestjs/common';
import { MerchantService } from '../../merchants/merchants.service';
import { ConversationManager } from '../conversation/conversation.manager';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransactionType } from '../../transactions/schemas/transaction.schema';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

@Injectable()
export class SendHandler {
  private readonly logger = new Logger(SendHandler.name);
  private solanaConnection: Connection;
  private readonly USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solana

  constructor(
    private merchantsService: MerchantService,
    private conversationManager: ConversationManager,
    private transactionsService: TransactionsService,
  ) {
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
        `⚠️ No wallets configured yet.\n\n` + `Please add a wallet using /wallet first.`,
      );
      return;
    }

    await this.showWalletSelection(ctx, merchant);
  }

  private async showWalletSelection(ctx: any, merchant: any) {
    try {
      // Filter for active Solana wallets
      const solanaWallets = merchant.wallets.filter(
        (w: any) => w.chain === 'solana' && w.isActive,
      );

      if (solanaWallets.length === 0) {
        await ctx.reply(
          `⚠️ No Solana wallets found.\n\n` +
            `Add a Solana wallet using /wallet first.`,
        );
        return;
      }

      // Fetch balances for each wallet
      const walletsWithBalance = await Promise.all(
        solanaWallets.map(async (wallet: any) => {
          try {
            const balance = await this.getSOLBalance(wallet.address);
            this.logger.log(`Balance for ${wallet.address}: ${balance} SOL`);
            return { ...wallet, balance };
          } catch (error) {
            this.logger.error(
              `Failed to fetch balance for ${wallet.address}: ${error.message}`,
              error.stack,
            );
            return { ...wallet, balance: 0, error: error.message };
          }
        }),
      );

      // Filter wallets with balance > 0
      const walletsWithFunds = walletsWithBalance.filter((w) => w.balance > 0);

      if (walletsWithFunds.length === 0) {
        // Check if there were any errors
        const walletsWithErrors = walletsWithBalance.filter((w) => w.error);

        if (walletsWithErrors.length > 0) {
          this.logger.error(`Found ${walletsWithErrors.length} wallets with balance fetch errors`);
          await ctx.reply(
            `⚠️ Unable to fetch wallet balances.\n\n` +
              `This could be due to:\n` +
              `• Network connectivity issues\n` +
              `• RPC rate limiting\n` +
              `• Invalid wallet addresses\n\n` +
              `Try using /balance to check your wallets first.\n\n` +
              `If the issue persists, please try again in a few moments.`,
          );
        } else {
          // All wallets fetched successfully but have 0 SOL
          await ctx.reply(
            `⚠️ Insufficient SOL for transaction fees.\n\n` +
              `Your Solana wallet(s) have 0 SOL.\n\n` +
              `⚡️ You need at least 0.001 SOL (~$0.20) to pay for transaction fees, even when sending USDC or other tokens.\n\n` +
              `💡 To send your USDC:\n` +
              `1. Transfer some SOL to your wallet first\n` +
              `2. Then use /send to transfer your tokens\n\n` +
              `Use /balance to view your wallet address and check your balance.`,
          );
        }
        return;
      }

      // Build inline keyboard with wallet options
      const buttons = walletsWithFunds.map((wallet: any) => {
        const label = wallet.label || 'Wallet';
        const maskedAddress = `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`;
        return [
          {
            text: `${label} (${wallet.balance.toFixed(4)} SOL) - ${maskedAddress}`,
            callback_data: `send_wallet:${wallet.address}`,
          },
        ];
      });

      buttons.push([{ text: '❌ Cancel', callback_data: 'send_cancel' }]);

      await ctx.reply(`📤 Send Crypto\n\n` + `Select the wallet to send from:`, {
        reply_markup: { inline_keyboard: buttons },
      });
    } catch (error) {
      this.logger.error(`Error in showWalletSelection: ${error.message}`, error.stack);
      await ctx.reply('❌ Failed to load wallets. Please try again.');
    }
  }

  async handleWalletSelection(ctx: any, walletAddress: string) {
    const telegramId = ctx.from.id.toString();
    const merchant = await this.merchantsService.findByTelegramId(telegramId);

    if (!merchant) return;

    // Store selected wallet in conversation state
    await this.conversationManager.setState(
      telegramId,
      merchant._id.toString(),
      'send',
      'awaiting_token_type',
      { walletAddress },
    );

    await this.showTokenTypeSelection(ctx);
  }

  private async showTokenTypeSelection(ctx: any) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '💰 SOL (Native)', callback_data: 'send_token_type:sol' }],
        [{ text: '💵 USDC', callback_data: 'send_token_type:usdc' }],
        [{ text: '❌ Cancel', callback_data: 'send_cancel' }],
      ],
    };

    await ctx.reply(
      `🪙 Select Token Type\n\n` +
        `What type of token do you want to send?\n\n` +
        `• SOL: Native Solana token\n` +
        `• USDC: USD Coin stablecoin`,
      { reply_markup: keyboard },
    );
  }

  async handleTokenTypeSelection(ctx: any, tokenType: string) {
    const telegramId = ctx.from.id.toString();
    const state = await this.conversationManager.getState(telegramId);

    if (!state) {
      await ctx.reply('❌ Session expired. Please start over with /send');
      return;
    }

    if (tokenType === 'sol') {
      // For SOL, skip to recipient address
      await this.conversationManager.updateState(telegramId, 'awaiting_recipient', {
        ...state.data,
        tokenType: 'sol',
      });

      await ctx.reply(
        `📬 Enter Recipient Address\n\n` +
          `Please enter the Solana address to send to.\n\n` +
          `Example: \`9xQeKvJHW7EfJpNvFvq7BqyFXY7XPZc5kjFU7Kkp\`\n\n` +
          `Type \`cancel\` to abort.`,
        { parse_mode: 'Markdown' },
      );
    } else if (tokenType === 'usdc') {
      // For USDC, automatically fetch balance
      try {
        await ctx.reply('🔄 Checking USDC balance...');

        const tokenInfo = await this.getSPLTokenBalance(state.data.walletAddress, this.USDC_MINT);

        if (tokenInfo.balance === 0) {
          await ctx.reply(
            `❌ No USDC balance found.\n\n` +
              `Your wallet does not hold any USDC tokens. Please add USDC to your wallet first.\n\n` +
              `Use /send to try again.`,
          );
          await this.conversationManager.clearState(telegramId);
          return;
        }

        // Store USDC info and proceed to recipient
        await this.conversationManager.updateState(telegramId, 'awaiting_recipient', {
          ...state.data,
          tokenType: 'usdc',
          tokenMint: this.USDC_MINT,
          tokenDecimals: tokenInfo.decimals,
          tokenBalance: tokenInfo.balance,
          tokenSymbol: 'USDC',
        });

        await ctx.reply(
          `✅ USDC balance: ${this.formatBalance(tokenInfo.balance, 'USDC')}\n\n` +
            `📬 Enter Recipient Address\n\n` +
            `Please enter the Solana address to send to.\n\n` +
            `Example: \`9xQeKvJHW7EfJpNvFvq7BqyFXY7XPZc5kjFU7Kkp\`\n\n` +
            `Type \`cancel\` to abort.`,
          { parse_mode: 'Markdown' },
        );
      } catch (error) {
        this.logger.error(`Error fetching USDC balance: ${error.message}`, error.stack);
        await ctx.reply(
          `❌ Failed to fetch USDC balance.\n\n` +
            `There was a network error. Please try again.\n\n` +
            `Use /send to try again.`,
        );
        await this.conversationManager.clearState(telegramId);
      }
    }
  }

  async handleTokenMintInput(ctx: any, state: any) {
    const input = ctx.message.text.trim();

    if (input.toLowerCase() === 'cancel') {
      await this.conversationManager.clearState(ctx.from.id.toString());
      await ctx.reply(`❌ Transfer cancelled.`);
      return;
    }

    // Validate mint address
    if (!this.validateMintAddress(input)) {
      await ctx.reply(
        `❌ Invalid SPL token mint address.\n\n` +
          `Please enter a valid Solana token mint address (32-44 characters, base58).\n\n` +
          `Example: \`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n` +
          `Type \`cancel\` to abort.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Fetch token balance
    try {
      const tokenInfo = await this.getSPLTokenBalance(state.data.walletAddress, input);

      if (tokenInfo.balance === 0) {
        await ctx.reply(
          `❌ No balance found for this token.\n\n` +
            `Your wallet does not hold any tokens from this mint address. Please check the address and try again.\n\n` +
            `Type \`cancel\` to abort.`,
        );
        return;
      }

      // Store token info and proceed to recipient
      await this.conversationManager.updateState(ctx.from.id.toString(), 'awaiting_recipient', {
        ...state.data,
        tokenMint: input,
        tokenDecimals: tokenInfo.decimals,
        tokenBalance: tokenInfo.balance,
        tokenSymbol: tokenInfo.symbol || 'Token',
      });

      await ctx.reply(
        `✅ Token found!\n\n` +
          `Balance: ${this.formatBalance(tokenInfo.balance, tokenInfo.symbol || 'Token')}\n\n` +
          `📬 Enter Recipient Address\n\n` +
          `Please enter the Solana address to send to.\n\n` +
          `Example: \`9xQeKvJHW7EfJpNvFvq7BqyFXY7XPZc5kjFU7Kkp\`\n\n` +
          `Type \`cancel\` to abort.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(`Error fetching SPL token balance: ${error.message}`, error.stack);
      await ctx.reply(
        `❌ Failed to fetch token information.\n\n` +
          `The token mint address may be invalid or there was a network error. Please try again.\n\n` +
          `Type \`cancel\` to abort.`,
      );
    }
  }

  async handleRecipientInput(ctx: any, state: any) {
    const input = ctx.message.text.trim();

    if (input.toLowerCase() === 'cancel') {
      await this.conversationManager.clearState(ctx.from.id.toString());
      await ctx.reply(`❌ Transfer cancelled.`);
      return;
    }

    // Validate Solana address
    if (!this.validateSolanaAddress(input)) {
      await ctx.reply(
        `❌ Invalid Solana address.\n\n` +
          `Please enter a valid Solana address (32-44 characters, base58).\n\n` +
          `Example: \`9xQeKvJHW7EfJpNvFvq7BqyFXY7XPZc5kjFU7Kkp\`\n\n` +
          `Type \`cancel\` to abort.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Store recipient and move to amount input
    await this.conversationManager.updateState(ctx.from.id.toString(), 'awaiting_amount', {
      ...state.data,
      recipientAddress: input,
    });

    // Fetch and show balance
    let balanceText = '';
    if (state.data.tokenType === 'sol') {
      const balance = await this.getSOLBalance(state.data.walletAddress);
      balanceText = `Your balance: ${this.formatBalance(balance, 'SOL')}`;
    } else {
      balanceText = `Your balance: ${this.formatBalance(state.data.tokenBalance, state.data.tokenSymbol)}`;
    }

    await ctx.reply(
      `💵 Enter Amount\n\n` +
        `${balanceText}\n\n` +
        `How much do you want to send?\n\n` +
        `Examples: \`0.5\`, \`100\`, or \`max\` to send all\n\n` +
        `Type \`cancel\` to abort.`,
      { parse_mode: 'Markdown' },
    );
  }

  async handleAmountInput(ctx: any, state: any) {
    const input = ctx.message.text.trim().toLowerCase();

    if (input === 'cancel') {
      await this.conversationManager.clearState(ctx.from.id.toString());
      await ctx.reply(`❌ Transfer cancelled.`);
      return;
    }

    // Get balance
    let balance = 0;
    if (state.data.tokenType === 'sol') {
      balance = await this.getSOLBalance(state.data.walletAddress);
    } else {
      balance = state.data.tokenBalance;
    }

    // Parse amount
    const amount = this.parseAmount(input, balance);

    if (amount === null) {
      await ctx.reply(
        `❌ Invalid amount.\n\n` +
          `Please enter a valid positive number or \`max\` to send all.\n\n` +
          `Examples: \`0.5\`, \`100\`, \`max\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Validate amount
    const validation = this.validateAmount(amount, balance, state.data.tokenType === 'usdc');

    if (!validation.valid) {
      await ctx.reply(validation.error, { parse_mode: 'Markdown' });
      return;
    }

    // Store amount and show confirmation
    await this.conversationManager.updateState(ctx.from.id.toString(), 'awaiting_confirmation', {
      ...state.data,
      amount,
    });

    await this.showConfirmation(ctx, {
      ...state,
      data: { ...state.data, amount },
    });
  }

  async showConfirmation(ctx: any, state: any) {
    const { walletAddress, recipientAddress, amount, tokenType, tokenSymbol } = state.data;

    const maskedSource = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
    const maskedDest = `${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}`;

    const symbol = tokenType === 'sol' ? 'SOL' : tokenSymbol;
    const fee = tokenType === 'sol' ? '~0.00001 SOL' : '~0.00001 SOL';

    await ctx.reply(
      `📤 Confirm Transfer\n\n` +
        `Source: \`${maskedSource}\`\n` +
        `Destination: \`${maskedDest}\`\n` +
        `Amount: ${this.formatBalance(amount, symbol)}\n` +
        `Estimated Fee: ${fee}\n\n` +
        `⚠️ This action cannot be undone!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirm Send', callback_data: 'send_confirm' }],
            [{ text: '❌ Cancel', callback_data: 'send_cancel' }],
          ],
        },
      },
    );
  }

  async executeTransaction(ctx: any, state: any) {
    const { walletAddress, recipientAddress, amount, tokenType, tokenMint, tokenDecimals, tokenSymbol } = state.data;

    try {
      const processingMsg = await ctx.reply('⏳ Processing transaction...');

      // Build transaction
      let unsignedTx: string;
      if (tokenType === 'sol') {
        unsignedTx = await this.buildSOLTransferTx(walletAddress, recipientAddress, amount);
      } else {
        unsignedTx = await this.buildSPLTokenTransferTx(
          walletAddress,
          recipientAddress,
          amount,
          tokenMint,
          tokenDecimals,
        );
      }

      // Sign and send transaction
      const telegramId = ctx.from.id.toString();
      const merchant = await this.merchantsService.findByTelegramId(telegramId);

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      const response = await this.merchantsService.sendTransaction(
        telegramId,
        unsignedTx,
        process.env.SOLANA_RPC_URL,
      );

      const signature = response.signature;

      // Record transaction in database (status automatically set to PENDING)
      await this.transactionsService.createTransaction({
        merchantId: merchant._id.toString(),
        txSignature: signature,
        chain: 'solana',
        type: TransactionType.WITHDRAWAL,
        amount,
        token: tokenSymbol || 'SOL',
        tokenMintAddress: tokenMint || null,
        fromAddress: walletAddress,
        toAddress: recipientAddress,
        fee: 0.00001,
        feeToken: 'SOL',
        description: 'Withdrawal via /send command',
      });

      // Wait for confirmation
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        undefined,
        '⏳ Waiting for confirmation...',
      );

      const confirmed = await this.waitForConfirmation(signature);

      if (confirmed) {
        // Update transaction status
        await this.transactionsService.confirmTransaction(signature, 1);

        const explorerUrl = this.getExplorerUrl(signature);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          undefined,
          `✅ Transaction confirmed!\n\n` +
            `Amount: ${this.formatBalance(amount, tokenSymbol || 'SOL')}\n` +
            `To: \`${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}\`\n\n` +
            `🔗 View transaction:\n${explorerUrl}\n\n` +
            `Use /balance to check your updated balance.`,
          { parse_mode: 'Markdown' },
        );
      } else {
        const explorerUrl = this.getExplorerUrl(signature);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          undefined,
          `⚠️ Transaction sent but confirmation timeout.\n\n` +
            `Transaction ID: \`${signature}\`\n` +
            `Check status: ${explorerUrl}\n\n` +
            `The transaction may still confirm. Please check the explorer.`,
          { parse_mode: 'Markdown' },
        );
      }

      // Clear conversation state
      await this.conversationManager.clearState(telegramId);
    } catch (error) {
      this.logger.error(`Error executing transaction: ${error.message}`, error.stack);

      // Record failed transaction with unique ID
      try {
        const merchant = await this.merchantsService.findByTelegramId(ctx.from.id.toString());
        if (merchant) {
          // Generate unique failed transaction ID
          const failedTxId = `failed_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          await this.transactionsService.createTransaction({
            merchantId: merchant._id.toString(),
            txSignature: failedTxId,
            chain: 'solana',
            type: TransactionType.WITHDRAWAL,
            amount,
            token: tokenSymbol || 'SOL',
            tokenMintAddress: tokenMint || null,
            fromAddress: walletAddress,
            toAddress: recipientAddress,
            fee: 0,
            feeToken: 'SOL',
            description: 'Withdrawal via /send command',
          });

          // Mark as failed immediately
          await this.transactionsService.failTransaction(failedTxId, error.message, 'solana');
        }
      } catch (recordError) {
        this.logger.error(`Failed to record failed transaction: ${recordError.message}`);
      }

      await ctx.reply(
        `❌ Transaction failed.\n\n` +
          `Error: ${error.message}\n\n` +
          `Please try again or contact support if the issue persists.`,
      );

      await this.conversationManager.clearState(ctx.from.id.toString());
    }
  }

  private async buildSOLTransferTx(from: string, to: string, amount: number): Promise<string> {
    const fromPubkey = new PublicKey(from);
    const toPubkey = new PublicKey(to);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      }),
    );

    const { blockhash } = await this.solanaConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return transaction.serialize({ requireAllSignatures: false }).toString('base64');
  }

  private async buildSPLTokenTransferTx(
    from: string,
    to: string,
    amount: number,
    mintAddress: string,
    decimals: number,
  ): Promise<string> {
    const fromPubkey = new PublicKey(from);
    const toPubkey = new PublicKey(to);
    const mintPubkey = new PublicKey(mintAddress);

    // Get associated token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
    const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

    const transaction = new Transaction();

    // Check if recipient token account exists
    const toAccountInfo = await this.solanaConnection.getAccountInfo(toTokenAccount);
    if (!toAccountInfo) {
      // Create associated token account for recipient
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey, // payer
          toTokenAccount,
          toPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    // Add transfer instruction
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        amountInSmallestUnit,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    // Set recent blockhash and fee payer
    const { blockhash } = await this.solanaConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return transaction.serialize({ requireAllSignatures: false }).toString('base64');
  }

  private async waitForConfirmation(signature: string, maxRetries: number = 30): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const status = await this.solanaConnection.getSignatureStatus(signature);

        if (status?.value?.confirmationStatus === 'finalized') {
          return true;
        }

        if (status?.value?.err) {
          throw new Error('Transaction failed on-chain');
        }

        // Wait 2 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.warn(`Error checking confirmation (attempt ${i + 1}): ${error.message}`);
      }
    }

    return false;
  }

  private async getSOLBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.solanaConnection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      this.logger.error(`Error fetching SOL balance: ${error.message}`);
      throw error;
    }
  }

  private async getSPLTokenBalance(
    walletAddress: string,
    mintAddress: string,
  ): Promise<{ balance: number; decimals: number; symbol?: string }> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(mintAddress);

      const tokenAccounts = await this.solanaConnection.getTokenAccountsByOwner(walletPubkey, {
        mint: mintPubkey,
      });

      if (tokenAccounts.value.length === 0) {
        return { balance: 0, decimals: 0 };
      }

      const balance = await this.solanaConnection.getTokenAccountBalance(
        tokenAccounts.value[0].pubkey,
      );

      return {
        balance: parseFloat(balance.value.uiAmount?.toString() || '0'),
        decimals: balance.value.decimals,
        symbol: undefined, // Can be fetched from Metaplex in future
      };
    } catch (error) {
      this.logger.error(`Error fetching SPL token balance: ${error.message}`);
      throw error;
    }
  }

  private validateMintAddress(address: string): boolean {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
  }

  private validateSolanaAddress(address: string): boolean {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
  }

  private parseAmount(input: string, balance: number): number | null {
    if (input === 'max') {
      // Reserve a small amount for fees
      return Math.max(0, balance - 0.001);
    }

    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    return amount;
  }

  private validateAmount(
    amount: number,
    balance: number,
    isSPL: boolean,
  ): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return {
        valid: false,
        error: `❌ Amount must be greater than 0.`,
      };
    }

    if (isSPL) {
      // For SPL tokens, just check if amount <= balance
      if (amount > balance) {
        return {
          valid: false,
          error:
            `❌ Insufficient balance.\n\n` +
            `You have: ${balance.toFixed(6)}\n` +
            `You need: ${amount.toFixed(6)}\n\n` +
            `Please enter a lower amount or type \`cancel\` to abort.`,
        };
      }
    } else {
      // For SOL, check if amount + fee <= balance
      const requiredAmount = amount + 0.001; // Reserve for fees
      if (requiredAmount > balance) {
        return {
          valid: false,
          error:
            `❌ Insufficient balance.\n\n` +
            `You have: ${balance.toFixed(4)} SOL\n` +
            `You need: ${amount.toFixed(4)} SOL + ~0.001 SOL (fees)\n\n` +
            `Please enter a lower amount or type \`cancel\` to abort.`,
        };
      }
    }

    return { valid: true };
  }

  private formatBalance(balance: number, symbol: string): string {
    if (balance >= 1000) {
      return `${balance.toFixed(2)} ${symbol}`;
    } else if (balance >= 1) {
      return `${balance.toFixed(4)} ${symbol}`;
    } else {
      return `${balance.toFixed(6)} ${symbol}`;
    }
  }

  private getExplorerUrl(signature: string): string {
    return `https://solscan.io/tx/${signature}`;
  }
}
