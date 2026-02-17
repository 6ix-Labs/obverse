export type PreviewType = 'link' | 'receipt' | 'dashboard';

export type PreviewErrorCode =
  | 'DATA_NOT_FOUND'
  | 'SIGNATURE_INVALID'
  | 'SIGNATURE_MISSING'
  | 'SIGNATURE_EXPIRED'
  | 'SIGNATURE_TTL_EXCEEDED'
  | 'RENDER_FAILED'
  | 'VALIDATION_FAILED';

export interface PreviewRenderResult {
  buffer: Buffer;
  statusCode: number;
  etag: string;
  lastModified?: Date;
  cacheControl: string;
  renderMs: number;
  errorCode?: PreviewErrorCode;
}

export interface LinkPreviewData {
  linkCode: string;
  merchantName: string;
  amount: number;
  token: string;
  chain: string;
  description?: string;
  logoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReceiptPreviewData {
  paymentId: string;
  amount: number;
  token: string;
  chain: string;
  status: string;
  txHashTruncated: string;
  createdAt?: Date;
  confirmedAt?: Date;
  updatedAt?: Date;
}

export interface DashboardPreviewData {
  dashboardId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  totalVolume: number;
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
  currency?: string;
  updatedAt?: Date;
}
