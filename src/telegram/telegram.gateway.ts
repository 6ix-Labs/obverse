import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { StartHandler } from './handlers/start.handler';
import { CreateLinkHandler } from './handlers/create-link.handler';
import { ListLinksHandler } from './handlers/list-links.handler';
import { ViewLinkHandler } from './handlers/view-link.handler';
import { HelpHandler } from './handlers/help.handler';
import { WalletHandler } from './handlers/wallet.handler';
import { SettingsHandler } from './handlers/setting.handler';
import { TransactionsHandler } from './handlers/transactions.handler';
import { BalanceHandler } from './handlers/balance.handler';
import { ConversationManager } from './conversation/conversation.manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramGateway implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TelegramGateway.name);
    private bot: Telegraf;

    constructor(
        private configService: ConfigService,
        private startHandler: StartHandler,
        private createLinkHandler: CreateLinkHandler,
        private listLinksHandler: ListLinksHandler,
        private viewLinkHandler: ViewLinkHandler,
        private helpHandler: HelpHandler,
        private walletHandler: WalletHandler,
        private settingsHandler: SettingsHandler,
        private transactionsHandler: TransactionsHandler,
        private balanceHandler: BalanceHandler,
        private conversationManager: ConversationManager,
    ) {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        this.logger.log(`Telegram Bot Token: ${token ? 'Loaded' : 'Not Loaded'}`);
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
        }
        this.bot = new Telegraf(token);
    }

    async onModuleInit() {
        try {
            this.registerCommands();
            this.registerMessageHandlers();

            // Add timeout to bot launch to prevent hanging
            const launchPromise = this.bot.launch();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Bot launch timeout after 10 seconds')), 10000)
            );

            await Promise.race([launchPromise, timeoutPromise]);
            this.logger.log('Telegram bot started successfully');
        } catch (error) {
            this.logger.error(`Failed to start Telegram bot: ${error.message}`, error.stack);
            this.logger.warn('Server will continue without Telegram bot functionality');
            // Don't throw - allow server to continue
        }
    }

    private registerCommands() {
        this.bot.command('start', async (ctx) => {
            try {
                await this.startHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /start command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });

        this.bot.command('payment', async (ctx) => {
            try {
                await this.createLinkHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /payment command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });

        this.bot.command('links', async (ctx) => {
            try {
                await this.listLinksHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /links command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });

        this.bot.command('wallet', async (ctx) => {
            try {
                await this.walletHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /wallet command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });

        this.bot.command('transactions', async (ctx) => {
            try {
                await this.transactionsHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /transactions command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });

        this.bot.command('settings', async (ctx) => {
            try {
                await this.settingsHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /settings command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });

        this.bot.command('help', async (ctx) => {
            try {
                await this.helpHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /help command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });

        this.bot.command('balance', async (ctx) => {
            try {
                await this.balanceHandler.handle(ctx);
            } catch (error) {
                this.logger.error(`Error in /balance command: ${error.message}`, error.stack);
                await ctx.reply('❌ Sorry, something went wrong. Please try again.');
            }
        });
    }

    private registerMessageHandlers() {
        // Handle text messages based on conversation state
        this.bot.on('text', async (ctx) => {
            const telegramId = ctx.from.id.toString();

            try {
                const state = await this.conversationManager.getState(telegramId);

                if (!state) return; // No active conversation

                switch (state.currentCommand) {
                    case 'start':
                        if (state.currentStep === 'awaiting_wallet') {
                            await this.startHandler.handleWalletInput(ctx, state);
                        }
                        break;

                    case 'payment':
                        if (state.currentStep === 'awaiting_custom_fields') {
                            await this.createLinkHandler.handleCustomFieldsInput(ctx, state);
                        } else if (state.currentStep === 'awaiting_amount') {
                            await this.createLinkHandler.handleAmountInput(ctx, state);
                        } else if (state.currentStep === 'awaiting_description') {
                            await this.createLinkHandler.handleDescriptionInput(ctx, state);
                        }
                        break;

                    case 'wallet':
                        if (state.currentStep === 'awaiting_new_wallet') {
                            await this.walletHandler.handleWalletInput(ctx, state);
                        }
                        break;

                    case 'settings':
                        if (state.currentStep === 'awaiting_webhook') {
                            await this.settingsHandler.handleWebhookInput(ctx, state);
                        } else if (state.currentStep === 'awaiting_default_fields') {
                            await this.settingsHandler.handleDefaultFieldsInput(ctx, state);
                        }
                        break;
                }
            } catch (error) {
                this.logger.error(`Error handling text message: ${error.message}`, error.stack);
                try {
                    await ctx.reply('❌ Sorry, something went wrong processing your message. Please try again.');
                } catch (replyError) {
                    this.logger.error(`Failed to send error message: ${replyError.message}`);
                }
            }
        });

        this.bot.on('callback_query', async (ctx) => {
            const telegramId = ctx.from.id.toString();

            try {
                // Type guard to check if callback query has data property
                const callbackQuery = ctx.callbackQuery;
                if (!('data' in callbackQuery) || typeof callbackQuery.data !== 'string') {
                    await ctx.answerCbQuery();
                    return;
                }

                const data = callbackQuery.data;

                // Handle view link callbacks (from list-links.handler.ts)
                if (data.startsWith('view:')) {
                    await ctx.answerCbQuery();
                    const linkId = data.replace('view:', '');
                    await this.viewLinkHandler.handleCallback(ctx, linkId);
                    return;
                }

                // Handle payments view callback
                if (data.startsWith('payments:')) {
                    await ctx.answerCbQuery();
                    const linkId = data.replace('payments:', '');
                    await this.viewLinkHandler.showRecentPayments(ctx, linkId);
                    return;
                }

                // Handle deactivate link callback
                if (data.startsWith('deactivate:')) {
                    await ctx.answerCbQuery();
                    const linkId = data.replace('deactivate:', '');
                    await this.viewLinkHandler.handleDeactivate(ctx, linkId);
                    return;
                }

                // Handle activate link callback
                if (data.startsWith('activate:')) {
                    await ctx.answerCbQuery();
                    const linkId = data.replace('activate:', '');
                    await this.viewLinkHandler.handleActivate(ctx, linkId);
                    return;
                }

                // Handle delete link callback
                if (data.startsWith('delete:')) {
                    await ctx.answerCbQuery();
                    const linkId = data.replace('delete:', '');
                    await this.viewLinkHandler.handleDelete(ctx, linkId);
                    return;
                }

                // Handle confirm delete callback
                if (data.startsWith('confirm_delete:')) {
                    await ctx.answerCbQuery();
                    const linkId = data.replace('confirm_delete:', '');
                    await this.viewLinkHandler.handleConfirmDelete(ctx, linkId);
                    return;
                }

                // Handle back to links callback
                if (data === 'back_to_links') {
                    await ctx.answerCbQuery();
                    await this.listLinksHandler.handle(ctx);
                    return;
                }

                // Handle wallet callbacks
                if (data === 'update_wallet') {
                    await ctx.answerCbQuery();
                    await this.walletHandler.startWalletUpdate(ctx);
                    return;
                }

                if (data === 'add_wallet') {
                    await ctx.answerCbQuery();
                    await this.walletHandler.startAddWallet(ctx);
                    return;
                }

                if (data.startsWith('update_wallet_chain:')) {
                    await ctx.answerCbQuery();
                    const chain = data.replace('update_wallet_chain:', '');
                    await this.walletHandler.handleWalletChainSelection(ctx, chain);
                    return;
                }

                if (data.startsWith('add_wallet_chain:')) {
                    await ctx.answerCbQuery();
                    const chain = data.replace('add_wallet_chain:', '');
                    await this.walletHandler.handleAddWalletChainSelection(ctx, chain);
                    return;
                }

                if (data === 'cancel') {
                    await ctx.answerCbQuery();
                    await ctx.reply('❌ Action cancelled.');
                    return;
                }

                // Handle settings callbacks
                if (data.startsWith('setting:')) {
                    await ctx.answerCbQuery();
                    const settingType = data.replace('setting:', '');
                    if (settingType === 'token') {
                        await this.settingsHandler.handleTokenChange(ctx);
                    } else if (settingType === 'notifications') {
                        await this.settingsHandler.toggleNotifications(ctx);
                    } else if (settingType === 'webhook') {
                        await this.settingsHandler.startWebhookSetup(ctx);
                    } else if (settingType === 'fields') {
                        await this.settingsHandler.startDefaultFieldsSetup(ctx);
                    }
                    return;
                }

                if (data.startsWith('token:')) {
                    await ctx.answerCbQuery();
                    const token = data.replace('token:', '');
                    await this.settingsHandler.updateToken(ctx, token);
                    return;
                }

                if (data === 'back_to_settings') {
                    await ctx.answerCbQuery();
                    await this.settingsHandler.handle(ctx);
                    return;
                }

                if (data.startsWith('default_fields:')) {
                    await ctx.answerCbQuery();
                    const state = await this.conversationManager.getState(telegramId);
                    if (state) {
                        await this.settingsHandler.handleDefaultFieldsInput(ctx, state);
                    }
                    return;
                }

                // Handle transaction callbacks
                if (data.startsWith('tx_page:')) {
                    await ctx.answerCbQuery();
                    const page = parseInt(data.replace('tx_page:', ''));
                    await this.transactionsHandler.handlePageChange(ctx, page);
                    return;
                }

                if (data.startsWith('tx_filter:')) {
                    await ctx.answerCbQuery();
                    const type = data.replace('tx_filter:', '');
                    await this.transactionsHandler.handleFilterChange(ctx, type);
                    return;
                }

                if (data === 'tx_stats') {
                    await ctx.answerCbQuery();
                    await this.transactionsHandler.showStats(ctx);
                    return;
                }

                if (data === 'tx_refresh') {
                    await ctx.answerCbQuery();
                    await this.transactionsHandler.handle(ctx);
                    return;
                }

                // Handle other callbacks that require conversation state
                const state = await this.conversationManager.getState(telegramId);
                if (!state) {
                    await ctx.answerCbQuery();
                    return;
                }

                if (data.startsWith('fields:')) {
                    await this.createLinkHandler.handleCustomFieldsInput(ctx, state);
                } else if (data.startsWith('reusable:')) {
                    await this.createLinkHandler.handleReusableInput(ctx, state);
                } else if (data === 'create_new') {
                    await this.createLinkHandler.handle(ctx);
                }
            } catch (error) {
                this.logger.error(`Error handling callback query: ${error.message}`, error.stack);
                try {
                    await ctx.answerCbQuery('❌ An error occurred. Please try again.');
                    await ctx.reply('❌ Sorry, something went wrong. Please try your request again.');
                } catch (replyError) {
                    this.logger.error(`Failed to send error message: ${replyError.message}`);
                }
            }
        });
    }

    async sendNotification(telegramId: string, message: string) {
        try {
            await this.bot.telegram.sendMessage(telegramId, message, {
                parse_mode: 'Markdown',
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    async onModuleDestroy() {
        console.log('Stopping Telegram bot...');
        await this.bot.stop();
        console.log('Telegram bot stopped');
    }
}