import express from 'express';
import { register, login, googleLogin, getMe, uploadStudentId, verifyOtp, resendOtp, getUserProfile } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/me', protect, getMe);
router.put('/verify', protect, upload.single('studentIdImage'), uploadStudentId);
router.get('/user/:userId', protect, getUserProfile);

export default router;
