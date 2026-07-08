import express from 'express';
import {
  createExchangeRequest,
  getUserExchangeRequests,
  acceptExchangeRequest,
  rejectExchangeRequest,
  cancelExchangeRequest,
  completeExchange
} from '../controllers/exchangeRequestController';
import { protect, requireApproved } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, requireApproved, createExchangeRequest);
router.get('/my-requests', protect, getUserExchangeRequests);
router.put('/:id/accept', protect, acceptExchangeRequest);
router.put('/:id/reject', protect, rejectExchangeRequest);
router.put('/:id/cancel', protect, cancelExchangeRequest);
router.put('/:id/complete', protect, completeExchange);

export default router;
