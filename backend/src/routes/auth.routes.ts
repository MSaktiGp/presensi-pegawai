import { Router } from 'express';
import { login, logout, getProfile } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.get('/profile', authMiddleware, getProfile);

export default router;
