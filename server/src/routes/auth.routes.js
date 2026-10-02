import {Router} from 'express';
import {z} from 'zod';
import * as c from '../controllers/auth.controller.js';
import {validate} from '../middleware/validate.js';
import {requireAuth} from '../middleware/auth.js';
import {authLimiter,refreshLimiter} from '../middleware/security.js';

const r=Router();
const register=z.object({
  username:z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  displayName:z.string().min(2).max(60),
  email:z.email(),
  password:z.string().min(8).max(72),
  confirmPassword:z.string().min(8),
  favoriteGame:z.string().min(2).max(60)
}).refine(x=>x.password===x.confirmPassword,{path:['confirmPassword'],message:'رمز عبور یکسان نیست.'});

r.post('/register',authLimiter,validate(register),c.register);
r.post('/login',authLimiter,validate(z.object({identifier:z.string().min(3).max(100),password:z.string().min(8).max(72)})),c.login);
r.get('/me',requireAuth,c.me);
r.post('/refresh',refreshLimiter,c.refresh);
r.post('/logout',c.logout);
export default r;
