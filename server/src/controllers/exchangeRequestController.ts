import { Response } from 'express';
import ExchangeRequest from '../models/ExchangeRequest';
import Resource from '../models/Resource';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const createExchangeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestedBookId, offeredBookId, message } = req.body;

    if (!requestedBookId || !offeredBookId) {
      return res.status(400).json({ success: false, message: 'Both requested and offered book IDs are required' });
    }

    const requestedBook = await Resource.findById(requestedBookId);
    if (!requestedBook) {
      return res.status(404).json({ success: false, message: 'Requested book not found' });
    }

    const offeredBook = await Resource.findById(offeredBookId);
    if (!offeredBook) {
      return res.status(404).json({ success: false, message: 'Offered book not found' });
    }

    // Business Rules
    // A user cannot exchange their own book.
    if (requestedBook.owner.toString() === req.user!._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot request an exchange on your own book' });
    }

    // Only own book can be offered.
    if (offeredBook.owner.toString() !== req.user!._id.toString()) {
      return res.status(400).json({ success: false, message: 'You can only offer books that you own' });
    }

    // Only Available books can receive requests.
    if (requestedBook.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'The requested book is not available' });
    }

    // Only Available books can be offered.
    if (offeredBook.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'The offered book is not available' });
    }

    // Check for existing pending request with same offered book
    const existing = await ExchangeRequest.findOne({
      requestedBook: requestedBookId,
      offeredBook: offeredBookId,
      requester: req.user!._id,
      status: 'Pending'
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending exchange request for this book with the same offered book' });
    }

    const exchangeRequest = await ExchangeRequest.create({
      requester: req.user!._id,
      receiver: requestedBook.owner,
      requestedBook: requestedBookId,
      offeredBook: offeredBookId,
      message: message || '',
      status: 'Pending'
    });

    // Create notification for requested book owner (receiver)
    await Notification.create({
      user: requestedBook.owner,
      type: 'RequestReceived',
      title: 'Exchange Request Received!',
      message: `${req.user!.name} offered to exchange their book "${offeredBook.title}" for your book "${requestedBook.title}".`,
      link: '/dashboard'
    });

    res.status(201).json({ success: true, exchangeRequest });
  } catch (error: any) {
    console.error('Create Exchange Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserExchangeRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    // Incoming requests (user is the receiver)
    const incoming = await ExchangeRequest.find({ receiver: userId })
      .populate('requestedBook', 'title author resourceType courseCode images status owner')
      .populate('offeredBook', 'title author resourceType courseCode images status owner')
      .populate('requester', 'name avatar department semester email phone')
      .sort({ createdAt: -1 });

    // Outgoing requests (user is the requester)
    const outgoing = await ExchangeRequest.find({ requester: userId })
      .populate('requestedBook', 'title author resourceType courseCode images status owner')
      .populate('offeredBook', 'title author resourceType courseCode images status owner')
      .populate('receiver', 'name avatar department semester email phone')
      .sort({ createdAt: -1 });

    // Filter out exchange requests with deleted resources/users
    const validIncoming = incoming.filter(r => r.requestedBook && r.offeredBook && r.requester);
    const validOutgoing = outgoing.filter(r => r.requestedBook && r.offeredBook && r.receiver);

    res.status(200).json({ success: true, incoming: validIncoming, outgoing: validOutgoing });
  } catch (error: any) {
    console.error('Get User Exchange Requests Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptExchangeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await ExchangeRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exchange request not found' });
    }

    // Only receiver can accept
    if (request.receiver.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Only the book owner can accept exchange requests' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Exchange request is not pending' });
    }

    const requestedBook = await Resource.findById(request.requestedBook);
    const offeredBook = await Resource.findById(request.offeredBook);

    if (!requestedBook || !offeredBook) {
      return res.status(404).json({ success: false, message: 'One or both books not found' });
    }

    if (requestedBook.status !== 'Available' || offeredBook.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'One or both books are no longer available' });
    }

    // Update statuses
    request.status = 'Accepted';
    await request.save();

    requestedBook.status = 'Reserved';
    await requestedBook.save();

    offeredBook.status = 'Reserved';
    await offeredBook.save();

    // Auto reject other pending requests for the requested book
    await ExchangeRequest.updateMany(
      {
        requestedBook: request.requestedBook,
        _id: { $ne: request._id },
        status: 'Pending'
      },
      { status: 'Rejected' }
    );

    // Notify requester
    await Notification.create({
      user: request.requester,
      type: 'RequestAccepted',
      title: 'Exchange Request Accepted!',
      message: `Your exchange request of "${offeredBook.title}" for "${requestedBook.title}" was accepted by ${req.user!.name}. Contact: ${req.user!.email}${req.user!.phone ? ' | ' + req.user!.phone : ''}.`,
      link: '/dashboard'
    });

    res.status(200).json({ success: true, exchangeRequest: request });
  } catch (error: any) {
    console.error('Accept Exchange Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectExchangeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await ExchangeRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exchange request not found' });
    }

    // Only receiver can reject
    if (request.receiver.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Only the book owner can reject exchange requests' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Exchange request is not pending' });
    }

    request.status = 'Rejected';
    await request.save();

    // Notify requester
    await Notification.create({
      user: request.requester,
      type: 'System',
      title: 'Exchange Request Declined',
      message: `Your exchange request for "${request.offeredBook}" was declined by ${req.user!.name}.`
    });

    res.status(200).json({ success: true, exchangeRequest: request });
  } catch (error: any) {
    console.error('Reject Exchange Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelExchangeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await ExchangeRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exchange request not found' });
    }

    // Only requester can cancel
    if (request.requester.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Only the requester can cancel exchange requests' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Exchange requests can only be cancelled while pending' });
    }

    request.status = 'Cancelled';
    await request.save();

    res.status(200).json({ success: true, exchangeRequest: request });
  } catch (error: any) {
    console.error('Cancel Exchange Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeExchange = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await ExchangeRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exchange request not found' });
    }

    // Both requester and receiver can complete
    const isRequester = request.requester.toString() === req.user!._id.toString();
    const isReceiver = request.receiver.toString() === req.user!._id.toString();

    if (!isRequester && !isReceiver) {
      return res.status(401).json({ success: false, message: 'Only exchange participants can mark it completed' });
    }

    if (request.status !== 'Accepted') {
      return res.status(400).json({ success: false, message: 'Exchange request must be accepted before completion' });
    }

    const requestedBook = await Resource.findById(request.requestedBook);
    const offeredBook = await Resource.findById(request.offeredBook);

    if (!requestedBook || !offeredBook) {
      return res.status(404).json({ success: false, message: 'One or both books not found' });
    }

    request.status = 'Completed';
    await request.save();

    requestedBook.status = 'Exchanged';
    await requestedBook.save();

    offeredBook.status = 'Exchanged';
    await offeredBook.save();

    // Send notifications to the other user
    const partnerId = isRequester ? request.receiver : request.requester;
    await Notification.create({
      user: partnerId,
      type: 'System',
      title: 'Exchange Completed!',
      message: `The exchange of "${offeredBook.title}" and "${requestedBook.title}" was marked as completed.`,
      link: '/dashboard'
    });

    res.status(200).json({ success: true, exchangeRequest: request });
  } catch (error: any) {
    console.error('Complete Exchange Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
