import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  reviewer: mongoose.Types.ObjectId;
  reviewedUser: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
  transaction: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ReviewSchema: Schema = new Schema({
  reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true }
}, {
  timestamps: true
});

// Avoid duplicate reviews for the same transaction by the same reviewer
ReviewSchema.index({ reviewer: 1, transaction: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', ReviewSchema);
