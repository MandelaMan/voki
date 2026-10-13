import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { adminService } from './services/admin.service';
import fs from 'fs';
import path from 'path';

const uploadDirs = ['images', 'receipts'].map((d) => path.join(config.uploadDir, d));
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Voki API running on port ${config.port}`);
  adminService.ensureConfiguredAdmin().catch((error) => {
    logger.error('Could not apply super admin emails', {
      error: error instanceof Error ? error.message : String(error),
    });
  });
});
