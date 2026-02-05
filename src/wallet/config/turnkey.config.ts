// src/wallet/config/turnkey.config.ts

import { registerAs } from '@nestjs/config';

export interface TurnkeyConfig {
  apiBaseUrl: string;
  apiPublicKey: string;
  apiPrivateKey: string;
  defaultOrganizationId: string;
  solanaRpcUrl: string;
}

export default registerAs(
  'turnkey',
  (): TurnkeyConfig => ({
    apiBaseUrl: process.env.TURNKEY_API_BASE_URL || 'https://api.turnkey.com',
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY || '',
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY || '',
    defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID || '',
    solanaRpcUrl:
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  }),
);
