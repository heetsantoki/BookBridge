import { Request, Response } from 'express';
import User from '../models/User';
import Resource from '../models/Resource';
import Transaction from '../models/Transaction';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalResources = await Resource.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const completedTransactions = await Transaction.countDocuments({ status: 'Completed' });
    const pendingVerifications = await User.countDocuments({ verificationStatus: 'pending' });

    // Aggregate resources by department
    const departmentWise = await Resource.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Aggregate resources by type
    const resourceTypeWise = await Resource.aggregate([
      { $group: { _id: '$resourceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Most requested books: group transactions by resource
    const mostRequested = await Transaction.aggregate([
      { $group: { _id: '$resource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const populatedMostRequested = await Resource.populate(mostRequested, {
      path: '_id',
      select: 'title author resourceType courseCode images'
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalResources,
        totalTransactions,
        completedTransactions,
        pendingVerifications,
        departmentWise,
        resourceTypeWise,
        mostRequested: populatedMostRequested.map((item: any) => ({
          resource: item._id,
          requestCount: item.count
        }))
      }
    });
  } catch (error: any) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPendingVerifications = async (req: AuthRequest, res: Response) => {
  try {
    const pendingStudents = await User.find({ verificationStatus: 'pending' })
      .select('name email avatar studentIdImage verificationStatus createdAt')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, pendingStudents });
  } catch (error: any) {
    console.error('Pending Verifications Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid verification action. Use "approve" or "reject".' });
    }

    const user = await User.findById(studentId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    if (action === 'approve') {
      user.verificationStatus = 'approved';
      user.isVerified = true;
      await user.save();

      // Notify the student
      await Notification.create({
        user: user._id,
        type: 'System',
        title: 'Account Approved!',
        message: 'Your Student ID has been approved by the Administrator. You can now post listings and exchange items!'
      });
    } else {
      user.verificationStatus = 'rejected';
      user.isVerified = false;
      await user.save();

      // Notify student
      await Notification.create({
        user: user._id,
        type: 'System',
        title: 'Account Verification Rejected',
        message: 'Your Student ID card photo upload was rejected. Please re-upload a clear copy under your profile settings.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Account has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.`,
      user: {
        id: user._id,
        name: user.name,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified
      }
    });
  } catch (error: any) {
    console.error('Verify Student Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
