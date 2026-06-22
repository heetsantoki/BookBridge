import { Request, Response } from 'express';
import Resource from '../models/Resource';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import { uploadFile } from '../middleware/upload';

export const createResource = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      author,
      description,
      resourceType,
      department,
      semester,
      courseCode,
      condition,
      exchangeType,
      price
    } = req.body;

    if (!title || !author || !description || !resourceType || !department || !semester || !courseCode || !condition || !exchangeType) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    let imageUrls: string[] = [];

    // Multer files handling
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map(file => uploadFile(file as Express.Multer.File));
      imageUrls = await Promise.all(uploadPromises);
    } else if (req.file) {
      const url = await uploadFile(req.file);
      imageUrls = [url];
    }

    // Default image if none uploaded
    if (imageUrls.length === 0) {
      imageUrls = ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600'];
    }

    const resource = await Resource.create({
      title,
      author,
      description,
      resourceType,
      department,
      semester: Number(semester),
      courseCode,
      condition,
      exchangeType,
      price: price ? Number(price) : 0,
      images: imageUrls,
      owner: req.user!._id,
      status: 'Available'
    });

    // Check wishlist triggers: Notify users who have wishlisted this resource title
    const wishlistedUsers = await User.find({
      wishlist: { $exists: true, $not: { $size: 0 } }
    });

    for (const user of wishlistedUsers) {
      // Simple case-insensitive matching for title keywords in user's wishlist (or if user has exact wishlist items, but wishlist contains Resource IDs)
      // Since wishlist contains IDs, let's see: if the user wishlist contains an item of similar title, or we can check if they have a match.
      // Alternatively, we can notify users based on department and semester mismatch if they have notifications active.
      // Let's implement keyword matching for title or notifying students in the same department/semester:
      if (user.department === department && user.semester === Number(semester)) {
        await Notification.create({
          user: user._id,
          type: 'WishlistAvailable',
          title: 'New Resource in Your Semester!',
          message: `A new ${resourceType} titled "${title}" has been uploaded for ${department} (Semester ${semester}).`,
          link: `/resources/${resource._id}`
        });
      }
    }

    res.status(201).json({ success: true, resource });
  } catch (error: any) {
    console.error('Create Resource Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getResources = async (req: Request, res: Response) => {
  try {
    const { search, resourceType, department, semester, exchangeType, condition, mine, ownerId } = req.query;

    const query: any = { status: 'Available' };

    if (search) {
      query.$text = { $search: search as string };
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (department) {
      query.department = department;
    }

    if (semester) {
      query.semester = Number(semester);
    }

    if (exchangeType) {
      query.exchangeType = exchangeType;
    }

    if (condition) {
      query.condition = condition;
    }

    if (ownerId) {
      query.owner = ownerId;
      delete query.status; // Show all states for specific profile searches
    }

    const resources = await Resource.find(query)
      .populate('owner', 'name avatar department semester')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: resources.length, resources });
  } catch (error: any) {
    console.error('Get Resources Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getResourceById = async (req: AuthRequest, res: Response) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource listing not found' });
    }

    // Check if the current requester is the owner
    const isOwner = req.user && req.user._id.toString() === resource.owner.toString();

    // Check if there is a mutually confirmed transaction between requester and owner for this resource
    let hasApprovedTransaction = false;
    if (req.user && !isOwner) {
      const transaction = await Transaction.findOne({
        resource: resource._id,
        requester: req.user._id,
        status: 'Approved'
      });
      if (transaction) {
        hasApprovedTransaction = true;
      }
    }

    // Populate owner profile. If transaction is not approved, hide contact credentials.
    let ownerDetails;
    if (isOwner || hasApprovedTransaction) {
      ownerDetails = await User.findById(resource.owner).select('name email phone avatar department semester role');
    } else {
      ownerDetails = await User.findById(resource.owner).select('name avatar department semester role');
    }

    res.status(200).json({
      success: true,
      resource,
      owner: ownerDetails,
      contactShared: isOwner || hasApprovedTransaction
    });
  } catch (error: any) {
    console.error('Get Resource ID Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateResource = async (req: AuthRequest, res: Response) => {
  try {
    let resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource listing not found' });
    }

    // Confirm ownership
    if (resource.owner.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to edit this resource' });
    }

    const { title, author, description, condition, price, exchangeType, status } = req.body;

    resource = await Resource.findByIdAndUpdate(
      req.params.id,
      {
        title,
        author,
        description,
        condition,
        price: price ? Number(price) : 0,
        exchangeType,
        status
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, resource });
  } catch (error: any) {
    console.error('Update Resource Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteResource = async (req: AuthRequest, res: Response) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource listing not found' });
    }

    // Confirm ownership
    if (resource.owner.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this resource' });
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Resource listing deleted successfully' });
  } catch (error: any) {
    console.error('Delete Resource Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const resourceId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const index = user.wishlist.indexOf(resourceId as any);
    let added = false;
    if (index === -1) {
      user.wishlist.push(resourceId as any);
      added = true;
    } else {
      user.wishlist.splice(index, 1);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: added ? 'Added to wishlist' : 'Removed from wishlist',
      wishlisted: added
    });
  } catch (error: any) {
    console.error('Wishlist Toggle Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).populate({
      path: 'wishlist',
      populate: { path: 'owner', select: 'name avatar' }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error: any) {
    console.error('Get Wishlist Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
