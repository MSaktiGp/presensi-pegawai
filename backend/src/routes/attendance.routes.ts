import { Router } from 'express';
import { checkin, checkout, getUserData, todayStatus, getHistory } from '../controllers/attendance.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All attendance routes require authentication
router.use(authMiddleware);

router.get('/user-data', getUserData);
router.get('/today-status', todayStatus);
router.get('/history', getHistory);
router.post('/checkin', checkin);
router.post('/checkout', checkout);

export default router;
