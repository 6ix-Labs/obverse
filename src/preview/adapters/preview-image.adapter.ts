import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class PreviewImageAdapter {
  private readonly logger = new Logger(PreviewImageAdapter.name);

  async renderSvgToPng(
    svg: string,
    width: number,
    height: number,
    timeoutMs: number,
  ): Promise<Buffer> {
    const renderPromise = sharp(Buffer.from(svg))
      .resize(width, height)
      .png()
      .toBuffer();

    if (!timeoutMs || timeoutMs <= 0) {
      return renderPromise;
    }

    return Promise.race([
      renderPromise,
      new Promise<Buffer>((_, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          reject(new Error('Preview render timed out'));
        }, timeoutMs);
      }),
    ]);
  }
}
