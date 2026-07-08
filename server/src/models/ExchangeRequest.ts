import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeRequest extends Document {
  requester: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  requestedBook: mongoose.Types.ObjectId;
  offeredBook: mongoose.Types.ObjectId;
  message?: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeRequestSchema: Schema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedBook: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
  offeredBook: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
  message: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

export default mongoose.model<IExchangeRequest>('ExchangeRequest', ExchangeRequestSchema);
