import express from 'express';
import { getDashboardStats, getPendingVerifications, verifyStudent } from '../controllers/adminController';
import { protect, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/stats', protect, requireAdmin, getDashboardStats);
router.get('/verifications', protect, requireAdmin, getPendingVerifications);
router.put('/verify/:studentId', protect, requireAdmin, verifyStudent);

export default router;
