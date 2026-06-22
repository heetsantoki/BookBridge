import { Request, Response } from 'express';
import Review from '../models/Review';
import Transaction from '../models/Transaction';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, rating, comment } = req.body;

    if (!transactionId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Please provide transactionId, rating (1-5), and a comment' });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction record not found' });
    }

    if (transaction.status !== 'Completed' && transaction.status !== 'Approved') {
      // Allow reviewing once approved/completed
      return res.status(400).json({ success: false, message: 'Reviews can only be written after transaction is completed' });
    }

    const isOwner = req.user!.id === transaction.owner.toString();
    const isRequester = req.user!.id === transaction.requester.toString();

    if (!isOwner && !isRequester) {
      return res.status(403).json({ success: false, message: 'You are not authorized to review this transaction' });
    }

    const reviewedUser = isOwner ? transaction.requester : transaction.owner;

    // Check if review already exists
    const existing = await Review.findOne({
      reviewer: req.user!.id,
      transaction: transactionId
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this transaction' });
    }

    const review = await Review.create({
      reviewer: req.user!.id,
      reviewedUser,
      rating: Number(rating),
      comment,
      transaction: transactionId
    });

    // Notify the reviewed user
    await Notification.create({
      user: reviewedUser,
      type: 'System',
      title: 'New Review Received!',
      message: `${req.user!.name} rated you ${rating} stars: "${comment.substring(0, 30)}..."`
    });

    res.status(201).json({ success: true, review });
  } catch (error: any) {
    console.error('Create Review Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserReviews = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewedUser: userId })
      .populate('reviewer', 'name avatar department semester')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const aggregate = await Review.aggregate([
      { $match: { reviewedUser: new Object(userId) as any } },
      { $group: { _id: '$reviewedUser', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    const stats = aggregate[0] || { avgRating: 0, count: 0 };

    res.status(200).json({
      success: true,
      reviews,
      avgRating: stats.avgRating ? Number(stats.avgRating.toFixed(1)) : 0,
      reviewCount: stats.count || 0
    });
  } catch (error: any) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
