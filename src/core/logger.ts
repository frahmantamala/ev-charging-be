import pino from 'pino';

export function maskSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const SENSITIVE_KEYS = ['idTag', 'rfid', 'token', 'password', 'authorization', 'auth', 'accessToken'];
  const mask = (val: string) => val ? val.slice(0, 2) + '***' + val.slice(-2) : val;
  if (Array.isArray(obj)) {
    return obj.map(maskSensitive);
  }
  const out: any = {};
  for (const k of Object.keys(obj)) {
    if (SENSITIVE_KEYS.includes(k)) {
      out[k] = typeof obj[k] === 'string' ? mask(obj[k]) : '[MASKED]';
    } else if (typeof obj[k] === 'object' && obj[k] !== null) {
      out[k] = maskSensitive(obj[k]);
    } else {
      out[k] = obj[k];
    }
  }
  return out;
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

export default logger;
