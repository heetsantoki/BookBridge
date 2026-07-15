import express from 'express';
import {
  createReview,
  updateReview,
  deleteReview,
  getUserReviews,
  toggleLikeReview,
  toggleDislikeReview,
  reportReview,
  getTopLevelComments,
  getCommentReplies,
  createComment,
  toggleLikeComment,
  checkEligibility,
  getReviewByTransaction,
  getReviewByExchangeRequest
} from '../controllers/reviewController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Eligibility check
router.get('/check-eligibility/:userId', protect, checkEligibility);

// Get review by transaction / exchange
router.get('/transaction/:transactionId', protect, getReviewByTransaction);
router.get('/exchange-request/:exchangeRequestId', protect, getReviewByExchangeRequest);

// Review CRUD
router.post('/', protect, createReview);
router.put('/:reviewId', protect, updateReview);
router.delete('/:reviewId', protect, deleteReview);

// Fetch reviews for a user
router.get('/user/:userId', getUserReviews);

// Reactions
router.post('/:reviewId/like', protect, toggleLikeReview);
router.post('/:reviewId/dislike', protect, toggleDislikeReview);

// Report
router.post('/:reviewId/report', protect, reportReview);

// Comments & Threaded replies
router.get('/:reviewId/comments', getTopLevelComments);
router.get('/comments/:commentId/replies', getCommentReplies);
router.post('/:reviewId/comments', protect, createComment);
router.post('/comments/:commentId/like', protect, toggleLikeComment);

export default router;
