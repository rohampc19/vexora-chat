import 'dotenv/config';
import {z} from 'zod';

const S=z.object({
  NODE_ENV:z.enum(['development','test','production']).default('development'),
  PORT:z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN:z.string().url().default('http://localhost:5173'),
  DATABASE_URL:z.string().min(1),
  MONGODB_URI:z.string().min(1),
  JWT_ACCESS_SECRET:z.string().min(32),
  JWT_REFRESH_SECRET:z.string().min(32),
  ACCESS_TOKEN_TTL:z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS:z.coerce.number().positive().default(30),
  COOKIE_SECURE:z.string().default('false').transform(v=>v==='true'),
  RATE_LIMIT_WINDOW_MS:z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX:z.coerce.number().int().positive().default(120),
  UPLOAD_DIR:z.string().default('uploads')
});

const parsed=S.parse(process.env);
if(parsed.NODE_ENV==='production'){
  if(!parsed.COOKIE_SECURE)throw new Error('COOKIE_SECURE must be true in production.');
  if(parsed.CLIENT_ORIGIN.startsWith('http://localhost'))throw new Error('CLIENT_ORIGIN must be a real HTTPS origin in production.');
}
export const env=parsed;
