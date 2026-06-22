import express from 'express';
import { generateDescription, getAIRecommendations } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/generate-description', protect, generateDescription);
router.get('/recommendations', protect, getAIRecommendations);

export default router;
