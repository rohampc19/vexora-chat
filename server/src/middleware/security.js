import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import {env} from '../config/env.js';

const limiter=(windowMs,max)=>rateLimit({
  windowMs,
  max,
  standardHeaders:true,
  legacyHeaders:false,
  skip:()=>env.NODE_ENV==='test'
});

export const authLimiter=limiter(15*60*1000,20);
export const refreshLimiter=limiter(15*60*1000,30);
export const mutationLimiter=limiter(60*1000,60);

export const security=[
  helmet({
    crossOriginResourcePolicy:{policy:'cross-origin'}
  }),
  cors({origin:env.CLIENT_ORIGIN,credentials:true}),
  cookieParser(),
  limiter(env.RATE_LIMIT_WINDOW_MS,env.RATE_LIMIT_MAX)
];
