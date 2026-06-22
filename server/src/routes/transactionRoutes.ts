import express from 'express';
import { createTransactionRequest, getUserTransactions, updateTransactionStatus } from '../controllers/transactionController';
import { protect, requireApproved } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, requireApproved, createTransactionRequest);
router.get('/my-exchanges', protect, getUserTransactions);
router.put('/:transactionId/status', protect, updateTransactionStatus);

export default router;
