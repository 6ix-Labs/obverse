// src/wallet/entities/wallet.entity.ts

export interface TurnkeyWalletAccount {
  walletAccountId: string;
  organizationId: string;
  walletId: string;
  curve: 'CURVE_SECP256K1' | 'CURVE_ED25519';
  pathFormat: 'PATH_FORMAT_BIP32';
  path: string;
  addressFormat: string;
  address: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TurnkeyWallet {
  walletId: string;
  walletName: string;
  organizationId: string;
  accounts: TurnkeyWalletAccount[];
  exported: boolean;
  imported: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// This entity maps your users to their Turnkey wallets
export interface UserWallet {
  id: string;
  odaUserId: string; // Telegram user id / external user id
  subOrganizationId: string;
  walletId: string;
  solanaAddress: string;
  ethereumAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletResult {
  subOrganizationId: string;
  walletId: string;
  solanaAddress: string;
  ethereumAddress?: string;
}

export interface SignTransactionParams {
  walletAddress: string;
  unsignedTransaction: string;
  organizationId: string;
}

export interface SignTransactionResult {
  signedTransaction: string;
}
