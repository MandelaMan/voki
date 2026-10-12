import { config } from '../config';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const log = (level: LogLevel, message: string, meta?: unknown) => {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message, ...(meta ? { meta } : {}) };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (config.isDev) {
    console.log(JSON.stringify(entry));
  }
};

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};
