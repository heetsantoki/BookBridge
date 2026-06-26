import express from 'express';
import { sendMessage, getConversations, getMessages, getUnreadCount, uploadMessageImage } from '../controllers/messageController';
import { protect, requireApproved } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/', protect, requireApproved, sendMessage);
router.post('/upload', protect, requireApproved, upload.single('image'), uploadMessageImage);
router.get('/conversations', protect, getConversations);
router.get('/unread-count', protect, getUnreadCount);
router.get('/conversation/:partnerId/:resourceId', protect, getMessages);

export default router;
