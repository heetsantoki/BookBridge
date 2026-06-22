import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: 'RequestReceived' | 'RequestAccepted' | 'NewMessage' | 'WishlistAvailable' | 'System';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['RequestReceived', 'RequestAccepted', 'NewMessage', 'WishlistAvailable', 'System'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String }
}, {
  timestamps: true
});

NotificationSchema.index({ user: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
