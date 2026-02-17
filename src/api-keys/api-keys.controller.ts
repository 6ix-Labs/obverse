import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { MerchantService } from '../merchants/merchants.service';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly merchantService: MerchantService,
  ) {}

  /**
   * POST /api-keys/create
   * PUBLIC endpoint - Generate API key for agents (no auth required)
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create API key (Public - No auth required)',
    description:
      'Public endpoint for external agents to generate API keys. Provide your telegramId or merchantId to create a key.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        telegramId: {
          type: 'string',
          description: 'Your Telegram ID (if you use Telegram bot)',
          example: '123456789',
        },
        merchantId: {
          type: 'string',
          description: 'Your merchant ID (alternative to telegramId)',
          example: '507f1f77bcf86cd799439011',
        },
        name: {
          type: 'string',
          description: 'Friendly name for the API key',
          example: 'OpenClaw Production',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Optional expiration date (ISO 8601)',
          example: '2027-12-31T23:59:59.999Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    schema: {
      example: {
        success: true,
        apiKey: {
          _id: '507f1f77bcf86cd799439012',
          name: 'OpenClaw Production',
          merchantId: '507f1f77bcf86cd799439011',
          isActive: true,
          createdAt: '2026-02-11T12:00:00Z',
        },
        key: 'obv_sk_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z',
        message: '⚠️ Save this key securely! It will not be shown again.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Missing telegramId/merchantId or invalid data',
  })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
  })
  async createApiKeyPublic(
    @Body()
    body: {
      telegramId?: string;
      merchantId?: string;
      name: string;
      expiresAt?: string;
    },
  ) {
    // Validate: Must provide either telegramId or merchantId
    if (!body.telegramId && !body.merchantId) {
      throw new BadRequestException(
        'Either telegramId or merchantId is required',
      );
    }

    // Find merchant
    let merchant;
    if (body.telegramId) {
      merchant = await this.merchantService.findByTelegramId(body.telegramId);
      if (!merchant) {
        throw new BadRequestException(
          `Merchant not found with telegramId: ${body.telegramId}. Please use the Telegram bot first to create your account.`,
        );
      }
    } else if (body.merchantId) {
      merchant = await this.merchantService.findById(body.merchantId);
      if (!merchant) {
        throw new BadRequestException(
          `Merchant not found with merchantId: ${body.merchantId}`,
        );
      }
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;

    // Generate API key
    const result = await this.apiKeysService.generateApiKey(
      merchant._id,
      body.name,
      expiresAt,
    );

    return {
      success: true,
      apiKey: {
        _id: result.apiKey._id,
        name: result.apiKey.name,
        merchantId: result.apiKey.merchantId,
        isActive: result.apiKey.isActive,
        createdAt: result.apiKey.createdAt,
        expiresAt: result.apiKey.expiresAt,
      },
      key: result.plainKey, // Full key shown only once
      message: '⚠️ Save this key securely! It will not be shown again.',
    };
  }

  /**
   * POST /api-keys/register
   * PUBLIC endpoint - Register as a new merchant and get an API key (any platform)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register & get API key (any platform)',
    description:
      'Self-service endpoint for agents from any platform (web, Discord, Slack, WhatsApp). Provide a username to create a merchant account and get an API key. Optionally provide your own wallet address, or a Turnkey wallet will be auto-created.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username'],
      properties: {
        username: {
          type: 'string',
          description: 'Display name for the merchant account',
          example: 'my-discord-bot',
        },
        walletAddress: {
          type: 'string',
          description:
            'Your existing wallet address (optional — if omitted, a wallet will be auto-created)',
          example: '0xABC123...',
        },
        chain: {
          type: 'string',
          description: 'Blockchain for the wallet (default: solana)',
          example: 'solana',
          default: 'solana',
        },
        keyName: {
          type: 'string',
          description:
            'Friendly name for the API key (default: "<username> API Key")',
          example: 'My Production Key',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Merchant created and API key generated',
    schema: {
      example: {
        success: true,
        merchant: {
          _id: '507f1f77bcf86cd799439011',
          username: 'my-discord-bot',
          walletAddress: 'GLAQCB5xjnRBG1pF9jNxN373hn7JN44bpuaAPGJcxfyC',
        },
        apiKey: {
          _id: '507f1f77bcf86cd799439012',
          name: 'my-discord-bot API Key',
        },
        key: 'obv_sk_1a2b3c4d...',
        message: '⚠️ Save this key securely! It will not be shown again.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Missing username',
  })
  async registerAndCreateApiKey(
    @Body()
    body: {
      username: string;
      walletAddress?: string;
      chain?: string;
      keyName?: string;
    },
  ) {
    if (!body.username || !body.username.trim()) {
      throw new BadRequestException('username is required');
    }

    // Create merchant (with or without wallet)
    const { merchant, wallet } = await this.merchantService.createAgentMerchant(
      {
        username: body.username.trim(),
        walletAddress: body.walletAddress,
        chain: body.chain,
      },
    );

    // Generate API key
    const keyName = body.keyName || `${body.username.trim()} API Key`;
    const result = await this.apiKeysService.generateApiKey(
      merchant._id,
      keyName,
    );

    return {
      success: true,
      merchant: {
        _id: merchant._id,
        username: merchant.username,
        walletAddress: merchant.walletAddress,
        wallets: merchant.wallets,
      },
      apiKey: {
        _id: result.apiKey._id,
        name: result.apiKey.name,
        merchantId: result.apiKey.merchantId,
        isActive: result.apiKey.isActive,
        createdAt: result.apiKey.createdAt,
      },
      key: result.plainKey,
      message: '⚠️ Save this key securely! It will not be shown again.',
    };
  }

  /**
   * POST /api-keys
   * Generate a new API key for the authenticated merchant (Dashboard users)
   */
  @Post()
  @UseGuards(JwtAuthGuard) // Protected: requires JWT auth
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generate new API key (Dashboard - requires JWT)',
    description:
      'Generate a new API key for programmatic access. The key is returned only once - save it securely! Requires dashboard login.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Friendly name for the API key',
          example: 'OpenClaw Production',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Optional expiration date (ISO 8601)',
          example: '2027-12-31T23:59:59.999Z',
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'API key generated successfully',
    schema: {
      example: {
        apiKey: {
          _id: '507f1f77bcf86cd799439011',
          name: 'OpenClaw Production',
          merchantId: '507f1f77bcf86cd799439010',
          isActive: true,
          createdAt: '2026-02-11T12:00:00Z',
          key: 'obv_sk_********************************',
        },
        plainKey: 'obv_sk_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z',
        message: 'Save this key securely! It will not be shown again.',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async generateApiKey(
    @Body() body: { name: string; expiresAt?: string },
    @Request() req,
  ) {
    const merchantId = req.user.merchantId;

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;

    const result = await this.apiKeysService.generateApiKey(
      merchantId,
      body.name,
      expiresAt,
    );

    return {
      apiKey: {
        ...result.apiKey.toObject(),
        key: `${result.plainKey.substring(0, 10)}${'*'.repeat(result.plainKey.length - 10)}`, // Mask key in response
      },
      plainKey: result.plainKey, // Full key shown only once
      message: 'Save this key securely! It will not be shown again.',
    };
  }

  /**
   * GET /api-keys
   * List all API keys for the authenticated merchant (Dashboard users)
   */
  @Get()
  @UseGuards(JwtAuthGuard) // Protected: requires JWT auth
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all API keys (Dashboard - requires JWT)',
    description:
      'Get all API keys for the authenticated merchant (keys are masked). Requires dashboard login.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of API keys',
    schema: {
      example: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'OpenClaw Production',
          key: 'obv_sk_****',
          isActive: true,
          lastUsed: '2026-02-11T10:30:00Z',
          createdAt: '2026-02-01T12:00:00Z',
          expiresAt: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async listApiKeys(@Request() req) {
    const merchantId = req.user.merchantId;

    const keys = await this.apiKeysService.listApiKeys(merchantId);

    // Mask keys in response
    return keys.map((key) => ({
      _id: key._id,
      name: key.name,
      key: `${key.key.substring(0, 10)}****`, // Show only first 10 chars
      isActive: key.isActive,
      lastUsed: key.lastUsed,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      metadata: key.metadata,
    }));
  }

  /**
   * DELETE /api-keys/:keyId
   * Revoke (deactivate) an API key (Dashboard users)
   */
  @Delete(':keyId')
  @UseGuards(JwtAuthGuard) // Protected: requires JWT auth
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke API key (Dashboard - requires JWT)',
    description:
      'Revoke (deactivate) an API key. The key can no longer be used for authentication. Requires dashboard login.',
  })
  @ApiParam({
    name: 'keyId',
    description: 'API key ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
    schema: {
      example: {
        message: 'API key revoked successfully',
        apiKey: {
          _id: '507f1f77bcf86cd799439011',
          name: 'OpenClaw Production',
          isActive: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  async revokeApiKey(@Param('keyId') keyId: string, @Request() req) {
    const merchantId = req.user.merchantId;

    const apiKey = await this.apiKeysService.revokeApiKey(keyId, merchantId);

    return {
      message: 'API key revoked successfully',
      apiKey: {
        _id: apiKey._id,
        name: apiKey.name,
        isActive: apiKey.isActive,
      },
    };
  }
}
