import pino from 'pino';

export const createLogger = () =>
  pino({
    name: 'stellar-x402-facilitator',
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty', options: { colorize: true } }
  });

