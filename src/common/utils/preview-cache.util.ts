import { createHash } from 'crypto';

export function computeReceiptPreviewVersion(input: {
  status?: string | null;
  updatedAt?: Date | string | null;
  confirmedAt?: Date | string | null;
  createdAt?: Date | string | null;
}): string {
  const status = input.status || 'unknown';
  const updatedAt = input.updatedAt
    ? new Date(input.updatedAt).toISOString()
    : '';
  const confirmedAt = input.confirmedAt
    ? new Date(input.confirmedAt).toISOString()
    : '';
  const createdAt = input.createdAt
    ? new Date(input.createdAt).toISOString()
    : '';

  return createHash('sha256')
    .update(`${status}|${updatedAt}|${confirmedAt}|${createdAt}`)
    .digest('hex')
    .slice(0, 16);
}

export function computePreviewEtag(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function truncateHash(hash: string, visible = 6): string {
  if (!hash) {
    return '';
  }
  if (hash.length <= visible * 2) {
    return hash;
  }
  return `${hash.slice(0, visible)}…${hash.slice(-visible)}`;
}
