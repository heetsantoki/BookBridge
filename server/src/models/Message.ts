import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string; // Combined sorted user IDs and resource ID to represent the conversation thread
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  resource: mongoose.Types.ObjectId;
  content: string;
  image?: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  conversationId: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resource: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
  content: { type: String, trim: true },
  image: { type: String, default: '' },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Compound index to retrieve conversations quickly
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
