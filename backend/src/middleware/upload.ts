import multer, { type StorageEngine } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import { config } from '../config';
import { logger } from '../utils/logger';
import { mimeTypeForExtension, saveStoredFile, uploadPublicPath } from '../services/storedFile.service';

/** Longest edge kept. Enough for a full-screen product photo on a phone or laptop. */
const MAX_EDGE = 2048;
/** WebP quality where photos stay visually the same and files get much smaller. */
const WEBP_QUALITY = 85;
/** Skip recompression when the upload is already a reasonable size at display resolution. */
const KEEP_ORIGINAL_MAX_BYTES = 400 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Resize oversized photos and re-encode as WebP.
 * Returns null when the original should be stored unchanged.
 */
export async function compressImageBuffer(input: Buffer): Promise<Buffer | null> {
  const image = sharp(input, { failOn: 'none', limitInputPixels: 40_000_000 });
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return null;

  const fitsDisplay = width <= MAX_EDGE && height <= MAX_EDGE;
  if (fitsDisplay && input.length <= KEEP_ORIGINAL_MAX_BYTES) return null;

  const output = await image
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: WEBP_QUALITY,
      alphaQuality: 100,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();

  if (output.length >= input.length) return null;
  return output;
}

function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function compressedStorage(subdir: 'images' | 'receipts'): StorageEngine {
  return {
    _handleFile(_req, file, cb) {
      const destination = path.join(config.uploadDir, subdir);
      ensureDir(destination);

      readStream(file.stream)
        .then(async (input) => {
          let data = input;
          let ext = EXT_BY_MIME[file.mimetype] ?? '.bin';

          if (file.mimetype.startsWith('image/')) {
            try {
              const compressed = await compressImageBuffer(input);
              if (compressed) {
                logger.info('Compressed image upload', {
                  fromBytes: input.length,
                  toBytes: compressed.length,
                });
                data = compressed;
                ext = '.webp';
              }
            } catch (error) {
              logger.warn('Image compression failed, storing original', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          const filename = `${uuidv4()}${ext}`;
          const filepath = path.join(destination, filename);
          const publicPath = uploadPublicPath(subdir, filename);
          await fs.promises.writeFile(filepath, data);
          try {
            await saveStoredFile(publicPath, data, mimeTypeForExtension(ext));
          } catch (error) {
            await fs.promises.unlink(filepath).catch(() => undefined);
            throw error;
          }
          cb(null, { destination, filename, path: filepath, size: data.length });
        })
        .catch((error: unknown) => {
          cb(error instanceof Error ? error : new Error('Failed to store upload'));
        });
    },
    _removeFile(_req, file, cb) {
      fs.unlink(file.path, cb);
    },
  };
}

const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const documentFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'));
  }
};

export const uploadImage = multer({
  storage: compressedStorage('images'),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadReceipt = multer({
  storage: compressedStorage('receipts'),
  fileFilter: documentFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
