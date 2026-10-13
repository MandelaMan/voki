import { config } from '../config';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const backgroundService = {
  async remove(input: Buffer, filename: string) {
    if (!config.removeBgApiKey) {
      throw new AppError(
        503,
        'Background removal is not set up on this server yet.',
        'REMOVEBG_UNAVAILABLE'
      );
    }

    const form = new FormData();
    form.append('size', 'auto');
    form.append('format', 'png');
    form.append('image_file', new Blob([new Uint8Array(input)]), filename || 'photo.jpg');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': config.removeBgApiKey },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('Background removal failed', { status: response.status, body: text.slice(0, 300) });
      throw new AppError(502, 'Could not remove the background. Try another photo.', 'REMOVEBG_FAILED');
    }

    return Buffer.from(await response.arrayBuffer());
  },
};
