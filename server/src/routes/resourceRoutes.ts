import express from 'express';
import {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  toggleWishlist,
  getWishlist
} from '../controllers/resourceController';
import { protect, requireApproved } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

router.post('/', protect, requireApproved, upload.array('images', 5), createResource);
router.get('/', getResources);
router.get('/wishlist', protect, getWishlist);
router.get('/:id', protect, getResourceById);
router.put('/:id', protect, requireApproved, updateResource);
router.delete('/:id', protect, requireApproved, deleteResource);
router.post('/:id/wishlist', protect, toggleWishlist);

export default router;
