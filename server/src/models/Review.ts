import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  reviewer: mongoose.Types.ObjectId;
  reviewedUser: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
  transaction?: mongoose.Types.ObjectId;
  exchangeRequest?: mongoose.Types.ObjectId;
  reviewType: 'BUY' | 'SELL' | 'RENT' | 'EXCHANGE' | 'BORROW' | 'FREE';
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema({
  reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: false },
  exchangeRequest: { type: Schema.Types.ObjectId, ref: 'ExchangeRequest', required: false },
  reviewType: {
    type: String,
    enum: ['BUY', 'SELL', 'RENT', 'EXCHANGE', 'BORROW', 'FREE'],
    required: true
  },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  dislikes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }]
}, {
  timestamps: true
});

// Avoid duplicate reviews for the same transaction/exchangeRequest by the same reviewer
ReviewSchema.index(
  { reviewer: 1, transaction: 1 },
  { unique: true, partialFilterExpression: { transaction: { $exists: true, $ne: null } } }
);
ReviewSchema.index(
  { reviewer: 1, exchangeRequest: 1 },
  { unique: true, partialFilterExpression: { exchangeRequest: { $exists: true, $ne: null } } }
);

export default mongoose.model<IReview>('Review', ReviewSchema);
