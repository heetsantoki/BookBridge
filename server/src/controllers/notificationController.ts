import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ user: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, notifications });
  } catch (error: any) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user!.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error: any) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany(
      { user: req.user!.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
