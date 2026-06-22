import express from 'express';
import { sendMessage, getConversations, getMessages, getUnreadCount } from '../controllers/messageController';
import { protect, requireApproved } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, requireApproved, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/unread-count', protect, getUnreadCount);
router.get('/conversation/:partnerId/:resourceId', protect, getMessages);

export default router;
