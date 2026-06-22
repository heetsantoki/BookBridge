import { Response } from 'express';
import Message from '../models/Message';
import Resource from '../models/Resource';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { AuthRequest } from '../middleware/auth';

export const getConversationId = (user1: string, user2: string, resourceId: string) => {
  const sortedUsers = [user1, user2].sort().join('-');
  return `${sortedUsers}_${resourceId}`;
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, resourceId, content } = req.body;

    if (!receiverId || !resourceId || !content) {
      return res.status(400).json({ success: false, message: 'Please provide receiverId, resourceId and message content' });
    }

    const senderId = req.user!.id;
    const conversationId = getConversationId(senderId, receiverId, resourceId);

    const message = await Message.create({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      resource: resourceId,
      content,
      isRead: false
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error: any) {
    console.error('Send Message Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all unique conversations involving the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name avatar email phone')
      .populate('receiver', 'name avatar email phone')
      .populate('resource', 'title author resourceType courseCode images owner status');

    // Aggregate to get unique conversation list with last message
    const conversationsMap: { [key: string]: any } = {};

    for (const msg of messages) {
      if (!conversationsMap[msg.conversationId]) {
        const senderIdStr = (msg.sender as any)._id ? (msg.sender as any)._id.toString() : msg.sender.toString();
        const otherUser = senderIdStr === userId ? (msg.receiver as any) : (msg.sender as any);
        const resource = msg.resource as any;

        if (!resource) continue; // Skip if resource is deleted

        // Check if there is an approved transaction for privacy sharing
        const transaction = await Transaction.findOne({
          resource: resource._id,
          status: 'Approved',
          $or: [
            { requester: userId, owner: otherUser._id },
            { requester: otherUser._id, owner: userId }
          ]
        });

        const isApproved = !!transaction;
        const isOwner = resource.owner.toString() === userId;

        // Hide contact info unless approved or self-owned
        const otherUserSafe = {
          _id: otherUser._id,
          name: otherUser.name,
          avatar: otherUser.avatar,
          email: (isApproved || isOwner) ? otherUser.email : undefined,
          phone: (isApproved || isOwner) ? otherUser.phone : undefined
        };

        conversationsMap[msg.conversationId] = {
          conversationId: msg.conversationId,
          otherUser: otherUserSafe,
          resource,
          lastMessage: {
            content: msg.content,
            sender: msg.sender._id,
            createdAt: msg.createdAt,
            isRead: msg.isRead
          },
          contactShared: isApproved || isOwner
        };
      }
    }

    const conversations = Object.values(conversationsMap);
    res.status(200).json({ success: true, count: conversations.length, conversations });
  } catch (error: any) {
    console.error('Get Conversations Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { partnerId, resourceId } = req.params;

    const conversationId = getConversationId(userId, partnerId, resourceId);

    // Retrieve all messages for this channel
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: 1 });

    // Mark messages sent to current user as read
    await Message.updateMany(
      { conversationId, receiver: userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, messages });
  } catch (error: any) {
    console.error('Get Messages Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get unread notification counts for messaging badge
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const unreadCount = await Message.countDocuments({
      receiver: req.user!.id,
      isRead: false
    });
    res.status(200).json({ success: true, unreadCount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
