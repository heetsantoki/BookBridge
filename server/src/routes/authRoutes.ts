import express from 'express';
import { register, login, googleLogin, getMe, uploadStudentId } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.put('/verify', protect, upload.single('studentIdImage'), uploadStudentId);

export default router;
