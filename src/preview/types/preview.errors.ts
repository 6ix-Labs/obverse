import { PreviewErrorCode } from './preview.types';

export class PreviewError extends Error {
  constructor(
    public readonly code: PreviewErrorCode,
    message: string,
  ) {
    super(message);
  }
}
