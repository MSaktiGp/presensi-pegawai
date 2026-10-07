import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.middleware';
import {
  listGerai, createGerai, updateGerai, toggleGerai,
  listPegawai, createPegawai, updatePegawai, togglePegawai, resetPassword,
  listShifts, createShift, updateShift, deleteShift, assignShift,
  getDashboardStats,
} from '../controllers/superadmin.controller';

const router = Router();

// All routes require auth + superadmin
router.use(authMiddleware);
router.use(superAdminAuthMiddleware);

// Dashboard stats
router.get('/dashboard', getDashboardStats);

// Gerai CRUD
router.get('/gerai', listGerai);
router.post('/gerai', createGerai);
router.put('/gerai/:id', updateGerai);
router.patch('/gerai/:id/toggle', toggleGerai);

// Pegawai CRUD
router.get('/pegawai', listPegawai);
router.post('/pegawai', createPegawai);
router.put('/pegawai/:id', updatePegawai);
router.patch('/pegawai/:id/toggle', togglePegawai);
router.patch('/pegawai/:id/reset-password', resetPassword);

// Shift management
router.get('/shifts', listShifts);
router.post('/shifts', createShift);
router.post('/shifts/assign', assignShift);
router.put('/shifts/:id', updateShift);
router.delete('/shifts/:id', deleteShift);

export default router;
