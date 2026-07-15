import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewComment extends Document {
  review: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  likes: mongoose.Types.ObjectId[];
  parentComment?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewCommentSchema: Schema = new Schema({
  review: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  parentComment: { type: Schema.Types.ObjectId, ref: 'ReviewComment', default: null }
}, {
  timestamps: true
});

export default mongoose.model<IReviewComment>('ReviewComment', ReviewCommentSchema);
