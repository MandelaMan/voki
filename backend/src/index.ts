import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';

const uploadDirs = ['images', 'receipts'].map((d) => path.join(config.uploadDir, d));
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.listen(config.port, () => {
  logger.info(`Voki API running on port ${config.port}`);
});
