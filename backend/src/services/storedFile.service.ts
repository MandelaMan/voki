import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

const SAFE_UPLOAD = /^\/uploads\/(images|receipts)\/[A-Za-z0-9._-]{1,200}$/;

export function mimeTypeForExtension(ext: string) {
  return MIME_BY_EXT[ext.toLowerCase()] ?? 'application/octet-stream';
}

export function uploadPublicPath(subdir: 'images' | 'receipts', filename: string) {
  return `/uploads/${subdir}/${filename}`;
}

export async function saveStoredFile(publicPath: string, data: Buffer, mimeType: string) {
  await prisma.storedFile.upsert({
    where: { path: publicPath },
    create: { path: publicPath, mimeType, data },
    update: { mimeType, data },
  });
}

export async function serveStoredUpload(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const raw = req.originalUrl.split('?')[0];
  let publicPath: string;
  try {
    publicPath = decodeURIComponent(raw);
  } catch {
    return next();
  }
  if (!SAFE_UPLOAD.test(publicPath) || publicPath.includes('..')) return next();

  try {
    const file = await prisma.storedFile.findUnique({ where: { path: publicPath } });
    if (!file) return next();

    const body = Buffer.from(file.data);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', body.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (req.method === 'HEAD') return res.end();
    return res.end(body);
  } catch (error) {
    return next(error);
  }
}
