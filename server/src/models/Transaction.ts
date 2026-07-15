import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  resource: mongoose.Types.ObjectId;
  requester: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  exchangeType: 'Borrow' | 'Rent' | 'Buy' | 'Free';
  price: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  isReviewedByRequester: boolean;
  isReviewedByOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  resource: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  exchangeType: {
    type: String,
    enum: ['Borrow', 'Rent', 'Buy', 'Free'],
    required: true
  },
  price: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
    default: 'Pending'
  },
  isReviewedByRequester: { type: Boolean, default: false },
  isReviewedByOwner: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
