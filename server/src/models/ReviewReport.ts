import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewReport extends Document {
  review: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  reason: 'Spam' | 'Harassment' | 'Fake Review' | 'Other';
  comment?: string;
  createdAt: Date;
}

const ReviewReportSchema: Schema = new Schema({
  review: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: {
    type: String,
    enum: ['Spam', 'Harassment', 'Fake Review', 'Other'],
    required: true
  },
  comment: { type: String, trim: true }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Avoid duplicate reports for the same review by the same reporter
ReviewReportSchema.index({ review: 1, reporter: 1 }, { unique: true });

export default mongoose.model<IReviewReport>('ReviewReport', ReviewReportSchema);
