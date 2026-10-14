import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${parseInt(process.env.PORT || '3001', 10)}`,
  isDev: process.env.NODE_ENV !== 'production',
  mpesa: {
    env: process.env.MPESA_ENV === 'production' ? 'production' as const : 'sandbox' as const,
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    shortCode: process.env.MPESA_SHORTCODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
    accountReference: (process.env.MPESA_ACCOUNT_REF || 'VOKI').slice(0, 12),
  },
  premium: {
    priceKes: positiveNumber(process.env.PREMIUM_PRICE_KES, 999),
    periodDays: positiveNumber(process.env.PREMIUM_PERIOD_DAYS, 30),
  },
  removeBgApiKey: process.env.REMOVEBG_API_KEY || '',
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@voki.local',
    password: process.env.SUPER_ADMIN_PASSWORD || 'VokiAdmin2026',
    firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Voki',
    lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
  },
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
