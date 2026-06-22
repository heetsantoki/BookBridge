import { Response } from 'express';
import Transaction from '../models/Transaction';
import Resource from '../models/Resource';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const createTransactionRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { resourceId } = req.body;

    if (!resourceId) {
      return res.status(400).json({ success: false, message: 'Resource ID is required' });
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    if (resource.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'Resource is no longer available' });
    }

    // Owner cannot request their own resource
    if (resource.owner.toString() === req.user!._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot request your own resource' });
    }

    // Check for existing pending request
    const existing = await Transaction.findOne({
      resource: resourceId,
      requester: req.user!._id,
      status: 'Pending'
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending request for this resource' });
    }

    const transaction = await Transaction.create({
      resource: resourceId,
      requester: req.user!._id,
      owner: resource.owner,
      exchangeType: resource.exchangeType,
      price: resource.price,
      status: 'Pending'
    });

    // Create Notification for the Resource Owner
    await Notification.create({
      user: resource.owner,
      type: 'RequestReceived',
      title: 'Exchange Request Received!',
      message: `${req.user!.name} requested to ${resource.exchangeType.toLowerCase()} your resource: "${resource.title}".`,
      link: '/dashboard'
    });

    res.status(201).json({ success: true, transaction });
  } catch (error: any) {
    console.error('Request Transaction Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    // Incoming trade requests where user is owner
    const incoming = await Transaction.find({ owner: userId })
      .populate('resource', 'title author resourceType courseCode images status')
      .populate('requester', 'name avatar department semester email phone')
      .sort({ createdAt: -1 });

    // Outgoing trade requests where user is requester
    const outgoing = await Transaction.find({ requester: userId })
      .populate('resource', 'title author resourceType courseCode images status owner')
      .populate('owner', 'name avatar department semester email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, incoming, outgoing });
  } catch (error: any) {
    console.error('Get User Transactions Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTransactionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { status } = req.body; // Approved, Rejected, Completed

    if (!['Approved', 'Rejected', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update' });
    }

    const transaction = await Transaction.findById(transactionId).populate('resource');
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction request not found' });
    }

    const resource = await Resource.findById(transaction.resource);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // Auth check: Seller/Owner must perform Approve or Reject. Requesters or owners can perform Complete.
    const isOwner = req.user!._id.toString() === transaction.owner.toString();
    const isRequester = req.user!._id.toString() === transaction.requester.toString();

    if (status === 'Approved' || status === 'Rejected') {
      if (!isOwner) {
        return res.status(401).json({ success: false, message: 'Only the resource owner can approve or reject requests' });
      }
    }

    if (status === 'Completed') {
      if (!isOwner && !isRequester) {
        return res.status(401).json({ success: false, message: 'Only transaction participants can mark it completed' });
      }
    }

    // State handling
    if (status === 'Approved') {
      if (resource.status !== 'Available') {
        return res.status(400).json({ success: false, message: 'Resource is no longer available' });
      }

      transaction.status = 'Approved';
      await transaction.save();

      // Mark book as exchanged (hide it from listing search)
      resource.status = 'Exchanged';
      await resource.save();

      // Auto-reject other pending requests for the same resource
      await Transaction.updateMany(
        {
          resource: resource._id,
          _id: { $ne: transaction._id },
          status: 'Pending'
        },
        { status: 'Rejected' }
      );

      // Create Notification for the requester (and send them details)
      await Notification.create({
        user: transaction.requester,
        type: 'RequestAccepted',
        title: 'Exchange Request Approved!',
        message: `Your request for "${resource.title}" was approved by ${req.user!.name}. Contact details are now unlocked.`,
        link: '/chat'
      });

      // Notify other pending requests that they were rejected
      const rejectedTransactions = await Transaction.find({
        resource: resource._id,
        status: 'Rejected',
        _id: { $ne: transaction._id }
      });

      for (const rej of rejectedTransactions) {
        await Notification.create({
          user: rej.requester,
          type: 'System',
          title: 'Request Declined',
          message: `The resource "${resource.title}" has been exchanged with another student.`
        });
      }
    } else if (status === 'Rejected') {
      transaction.status = 'Rejected';
      await transaction.save();

      await Notification.create({
        user: transaction.requester,
        type: 'System',
        title: 'Request Declined',
        message: `Your request for "${resource.title}" was declined.`
      });
    } else if (status === 'Completed') {
      transaction.status = 'Completed';
      await transaction.save();

      resource.status = 'Exchanged';
      await resource.save();

      // Notify other side
      const partnerId = isOwner ? transaction.requester : transaction.owner;
      await Notification.create({
        user: partnerId,
        type: 'System',
        title: 'Exchange Completed!',
        message: `The transaction for "${resource.title}" was marked as completed. Please leave a review!`,
        link: `/resources/${resource._id}`
      });
    }

    res.status(200).json({ success: true, transaction });
  } catch (error: any) {
    console.error('Update Transaction Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
