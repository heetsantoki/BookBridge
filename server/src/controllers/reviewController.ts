import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review';
import ReviewComment from '../models/ReviewComment';
import ReviewReport from '../models/ReviewReport';
import Transaction from '../models/Transaction';
import ExchangeRequest from '../models/ExchangeRequest';
import User from '../models/User';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// Helper to recalculate user rating stats and update User cached fields
const updateUserRatingStats = async (userId: string) => {
  try {
    const stats = await Review.aggregate([
      { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$reviewedUser', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    if (stats.length > 0) {
      await User.findByIdAndUpdate(userId, {
        avgRating: Number(stats[0].avgRating.toFixed(1)),
        reviewCount: stats[0].count
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        avgRating: 0,
        reviewCount: 0
      });
    }
  } catch (err) {
    console.error('Error updating user rating stats:', err);
  }
};

// Check if current user has any unreviewed completed transaction or exchange with target user
export const checkEligibility = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    if (currentUserId === userId) {
      return res.status(200).json({ success: true, eligible: false, message: 'You cannot review yourself' });
    }

    // 1. Check for Completed/Approved Transactions
    const transaction = await Transaction.findOne({
      status: { $in: ['Completed', 'Approved'] },
      $and: [
        {
          $or: [
            { requester: currentUserId, owner: userId },
            { requester: userId, owner: currentUserId }
          ]
        },
        {
          $or: [
            { requester: currentUserId, isReviewedByRequester: false },
            { owner: currentUserId, isReviewedByOwner: false }
          ]
        }
      ]
    }).populate('resource', 'title');

    if (transaction) {
      const isRequester = currentUserId === transaction.requester.toString();
      return res.status(200).json({
        success: true,
        eligible: true,
        transactionId: transaction._id,
        type: 'Transaction',
        resourceTitle: (transaction.resource as any)?.title || 'Book',
        exchangeType: transaction.exchangeType,
        isRequester
      });
    }

    // 2. Check for Completed/Accepted ExchangeRequests
    const exchange = await ExchangeRequest.findOne({
      status: { $in: ['Completed', 'Accepted'] },
      $and: [
        {
          $or: [
            { requester: currentUserId, receiver: userId },
            { requester: userId, receiver: currentUserId }
          ]
        },
        {
          $or: [
            { requester: currentUserId, isReviewedByRequester: false },
            { receiver: currentUserId, isReviewedByReceiver: false }
          ]
        }
      ]
    }).populate('requestedBook', 'title');

    if (exchange) {
      const isRequester = currentUserId === exchange.requester.toString();
      return res.status(200).json({
        success: true,
        eligible: true,
        exchangeRequestId: exchange._id,
        type: 'ExchangeRequest',
        resourceTitle: (exchange.requestedBook as any)?.title || 'Book',
        exchangeType: 'Exchange',
        isRequester
      });
    }

    res.status(200).json({ success: true, eligible: false, message: 'No unreviewed transactions found between you and this user.' });
  } catch (error: any) {
    console.error('Check Eligibility Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a review
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, exchangeRequestId, rating, comment } = req.body;
    const currentUserId = req.user!.id;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Please provide a rating (1-5) and a comment' });
    }

    let reviewedUser: any;
    let reviewType: 'BUY' | 'SELL' | 'RENT' | 'EXCHANGE' | 'BORROW' | 'FREE' = 'BUY';
    let transaction: any;
    let exchangeRequest: any;

    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      if (transaction.status !== 'Completed' && transaction.status !== 'Approved') {
        return res.status(400).json({ success: false, message: 'Reviews can only be written after transaction is completed' });
      }

      const isOwner = currentUserId === transaction.owner.toString();
      const isRequester = currentUserId === transaction.requester.toString();

      if (!isOwner && !isRequester) {
        return res.status(403).json({ success: false, message: 'You are not authorized to review this transaction' });
      }

      if (isRequester) {
        if (transaction.isReviewedByRequester) {
          return res.status(400).json({ success: false, message: 'You have already reviewed this transaction' });
        }
        reviewedUser = transaction.owner;
        if (transaction.exchangeType === 'Buy') reviewType = 'BUY';
        else if (transaction.exchangeType === 'Rent') reviewType = 'RENT';
        else if (transaction.exchangeType === 'Borrow') reviewType = 'BORROW';
        else if (transaction.exchangeType === 'Free') reviewType = 'FREE';
      } else {
        if (transaction.isReviewedByOwner) {
          return res.status(400).json({ success: false, message: 'You have already reviewed this transaction' });
        }
        reviewedUser = transaction.requester;
        if (transaction.exchangeType === 'Buy') reviewType = 'SELL';
        else if (transaction.exchangeType === 'Rent') reviewType = 'RENT';
        else if (transaction.exchangeType === 'Borrow') reviewType = 'BORROW';
        else if (transaction.exchangeType === 'Free') reviewType = 'FREE';
      }
    } else if (exchangeRequestId) {
      exchangeRequest = await ExchangeRequest.findById(exchangeRequestId);
      if (!exchangeRequest) {
        return res.status(404).json({ success: false, message: 'Exchange request not found' });
      }

      if (exchangeRequest.status !== 'Completed' && exchangeRequest.status !== 'Accepted') {
        return res.status(400).json({ success: false, message: 'Exchange can only be reviewed after it is completed' });
      }

      const isReceiver = currentUserId === exchangeRequest.receiver.toString();
      const isRequester = currentUserId === exchangeRequest.requester.toString();

      if (!isReceiver && !isRequester) {
        return res.status(403).json({ success: false, message: 'You are not authorized to review this exchange' });
      }

      if (isRequester) {
        if (exchangeRequest.isReviewedByRequester) {
          return res.status(400).json({ success: false, message: 'You have already reviewed this exchange' });
        }
        reviewedUser = exchangeRequest.receiver;
      } else {
        if (exchangeRequest.isReviewedByReceiver) {
          return res.status(400).json({ success: false, message: 'You have already reviewed this exchange' });
        }
        reviewedUser = exchangeRequest.requester;
      }
      reviewType = 'EXCHANGE';
    } else {
      return res.status(400).json({ success: false, message: 'Please provide either a transactionId or exchangeRequestId' });
    }

    if (currentUserId === reviewedUser.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot review yourself' });
    }

    // Create Review
    const review = await Review.create({
      reviewer: currentUserId,
      reviewedUser,
      rating: Number(rating),
      comment,
      transaction: transactionId || undefined,
      exchangeRequest: exchangeRequestId || undefined,
      reviewType,
      likes: [],
      dislikes: []
    });

    // Mark status inside Transaction or ExchangeRequest
    if (transactionId) {
      if (currentUserId === transaction.requester.toString()) {
        transaction.isReviewedByRequester = true;
      } else {
        transaction.isReviewedByOwner = true;
      }
      await transaction.save();
    } else if (exchangeRequestId) {
      if (currentUserId === exchangeRequest.requester.toString()) {
        exchangeRequest.isReviewedByRequester = true;
      } else {
        exchangeRequest.isReviewedByReceiver = true;
      }
      await exchangeRequest.save();
    }

    // Recalculate statistics
    await updateUserRatingStats(reviewedUser.toString());

    // Send Notification
    await Notification.create({
      user: reviewedUser,
      type: 'System',
      title: 'New Review Received!',
      message: `${req.user!.name} rated you ${rating} stars: "${comment.substring(0, 30)}..."`,
      link: `/profile/${reviewedUser}`
    });

    res.status(201).json({ success: true, review });
  } catch (error: any) {
    console.error('Create Review Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Edit a review
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const currentUserId = req.user!.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.reviewer.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this review' });
    }

    // Limit editing to 30 days
    const diffTime = Math.abs(new Date().getTime() - review.createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      return res.status(400).json({ success: false, message: 'Reviews can only be edited within 30 days of submission' });
    }

    if (rating) review.rating = Number(rating);
    if (comment) review.comment = comment;

    await review.save();

    // Recompute stats
    await updateUserRatingStats(review.reviewedUser.toString());

    res.status(200).json({ success: true, review });
  } catch (error: any) {
    console.error('Update Review Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a review
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const currentUserId = req.user!.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isAdmin = req.user!.role === 'admin';
    if (review.reviewer.toString() !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this review' });
    }

    // Reset reviewed flags
    if (review.transaction) {
      const transaction = await Transaction.findById(review.transaction);
      if (transaction) {
        if (review.reviewer.toString() === transaction.requester.toString()) {
          transaction.isReviewedByRequester = false;
        } else {
          transaction.isReviewedByOwner = false;
        }
        await transaction.save();
      }
    } else if (review.exchangeRequest) {
      const exchange = await ExchangeRequest.findById(review.exchangeRequest);
      if (exchange) {
        if (review.reviewer.toString() === exchange.requester.toString()) {
          exchange.isReviewedByRequester = false;
        } else {
          exchange.isReviewedByReceiver = false;
        }
        await exchange.save();
      }
    }

    const reviewedUserId = review.reviewedUser.toString();

    await Review.deleteOne({ _id: reviewId });

    // Clean up comments and reports
    await ReviewComment.deleteMany({ review: reviewId });
    await ReviewReport.deleteMany({ review: reviewId });

    // Update stats
    await updateUserRatingStats(reviewedUserId);

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Delete Review Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch user reviews with optional sorting
export const getUserReviews = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { sortBy } = req.query;

    let sortStage: any = { createdAt: -1 }; // Default: Newest

    if (sortBy === 'oldest') {
      sortStage = { createdAt: 1 };
    } else if (sortBy === 'highest') {
      sortStage = { rating: -1, createdAt: -1 };
    } else if (sortBy === 'lowest') {
      sortStage = { rating: 1, createdAt: -1 };
    } else if (sortBy === 'helpful') {
      sortStage = { likesCount: -1, createdAt: -1 };
    }

    const reviews = await Review.aggregate([
      { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$likes', []] } }
        }
      },
      { $sort: sortStage }
    ]);

    const populatedReviews = await Review.populate(reviews, [
      { path: 'reviewer', select: 'name avatar department semester' },
      { path: 'transaction', select: 'exchangeType price' },
      { path: 'exchangeRequest', select: 'status' }
    ]);

    const statsResult = await Review.aggregate([
      { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$reviewedUser',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = statsResult[0] || { avgRating: 0, count: 0 };

    res.status(200).json({
      success: true,
      reviews: populatedReviews,
      avgRating: stats.avgRating ? Number(stats.avgRating.toFixed(1)) : 0,
      reviewCount: stats.count || 0
    });
  } catch (error: any) {
    console.error('Get User Reviews Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle like on a review
export const toggleLikeReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const currentUserId = req.user!.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.reviewer.toString() === currentUserId) {
      return res.status(400).json({ success: false, message: 'You cannot like your own review' });
    }

    const likeIndex = review.likes.findIndex((id) => id.toString() === currentUserId);
    const dislikeIndex = review.dislikes.findIndex((id) => id.toString() === currentUserId);

    if (likeIndex > -1) {
      review.likes.splice(likeIndex, 1);
    } else {
      review.likes.push(currentUserId as any);
      if (dislikeIndex > -1) {
        review.dislikes.splice(dislikeIndex, 1);
      }

      // Notify
      await Notification.create({
        user: review.reviewer,
        type: 'System',
        title: 'Review Liked!',
        message: `${req.user!.name} liked your review.`,
        link: `/profile/${review.reviewedUser}`
      });
    }

    await review.save();
    res.status(200).json({ success: true, likes: review.likes, dislikes: review.dislikes });
  } catch (error: any) {
    console.error('Like Review Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle dislike on a review
export const toggleDislikeReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const currentUserId = req.user!.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.reviewer.toString() === currentUserId) {
      return res.status(400).json({ success: false, message: 'You cannot dislike your own review' });
    }

    const likeIndex = review.likes.findIndex((id) => id.toString() === currentUserId);
    const dislikeIndex = review.dislikes.findIndex((id) => id.toString() === currentUserId);

    if (dislikeIndex > -1) {
      review.dislikes.splice(dislikeIndex, 1);
    } else {
      review.dislikes.push(currentUserId as any);
      if (likeIndex > -1) {
        review.likes.splice(likeIndex, 1);
      }
    }

    await review.save();
    res.status(200).json({ success: true, likes: review.likes, dislikes: review.dislikes });
  } catch (error: any) {
    console.error('Dislike Review Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Report a review
export const reportReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reason, comment } = req.body;
    const currentUserId = req.user!.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please specify a reason' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const existing = await ReviewReport.findOne({ review: reviewId, reporter: currentUserId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reported this review' });
    }

    await ReviewReport.create({
      review: reviewId,
      reporter: currentUserId,
      reason,
      comment
    });

    res.status(201).json({ success: true, message: 'Review reported successfully' });
  } catch (error: any) {
    console.error('Report Review Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get top-level comments for a review
export const getTopLevelComments = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const comments = await ReviewComment.find({ review: reviewId, parentComment: null })
      .populate('user', 'name avatar department semester')
      .sort({ createdAt: -1 });

    const commentList = await Promise.all(comments.map(async (c) => {
      const replyCount = await ReviewComment.countDocuments({ parentComment: c._id });
      return {
        ...c.toObject(),
        replyCount
      };
    }));

    res.status(200).json({ success: true, comments: commentList });
  } catch (error: any) {
    console.error('Get Top Level Comments Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get comment replies
export const getCommentReplies = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const replies = await ReviewComment.find({ parentComment: commentId })
      .populate('user', 'name avatar department semester')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, replies });
  } catch (error: any) {
    console.error('Get Comment Replies Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a comment or threaded reply
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { text, parentCommentId } = req.body;
    const currentUserId = req.user!.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await ReviewComment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ success: false, message: 'Parent comment not found' });
      }
    }

    const newComment = await ReviewComment.create({
      review: reviewId,
      user: currentUserId,
      text: text.trim(),
      likes: [],
      parentComment: parentCommentId || null
    });

    const populated = await newComment.populate('user', 'name avatar department semester');

    // Notify
    if (parentComment) {
      if (parentComment.user.toString() !== currentUserId) {
        await Notification.create({
          user: parentComment.user,
          type: 'System',
          title: 'Reply Received!',
          message: `${req.user!.name} replied to your comment: "${text.substring(0, 30)}..."`,
          link: `/profile/${review.reviewedUser}`
        });
      }
    } else {
      if (review.reviewer.toString() !== currentUserId) {
        await Notification.create({
          user: review.reviewer,
          type: 'System',
          title: 'New Comment on Review!',
          message: `${req.user!.name} commented on your review: "${text.substring(0, 30)}..."`,
          link: `/profile/${review.reviewedUser}`
        });
      }
    }

    res.status(201).json({ success: true, comment: populated });
  } catch (error: any) {
    console.error('Create Comment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle like on comment
export const toggleLikeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const currentUserId = req.user!.id;

    const comment = await ReviewComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user.toString() === currentUserId) {
      return res.status(400).json({ success: false, message: 'You cannot like your own comment' });
    }

    const likeIndex = comment.likes.findIndex((id) => id.toString() === currentUserId);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(currentUserId as any);

      const review = await Review.findById(comment.review);
      const profileLink = review ? `/profile/${review.reviewedUser}` : '/dashboard';

      // Notify
      await Notification.create({
        user: comment.user,
        type: 'System',
        title: 'Comment Liked!',
        message: `${req.user!.name} liked your comment.`,
        link: profileLink
      });
    }

    await comment.save();
    res.status(200).json({ success: true, likes: comment.likes });
  } catch (error: any) {
    console.error('Like Comment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviewByTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const review = await Review.findOne({ reviewer: req.user!.id, transaction: transactionId });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.status(200).json({ success: true, review });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviewByExchangeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { exchangeRequestId } = req.params;
    const review = await Review.findOne({ reviewer: req.user!.id, exchangeRequest: exchangeRequestId });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.status(200).json({ success: true, review });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
