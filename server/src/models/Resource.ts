import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  title: string;
  author: string;
  description: string;
  resourceType: 'Textbook' | 'Notes' | 'Previous Year Paper' | 'Lab Manual' | 'Project Report' | 'E-book/PDF';
  department: string;
  semester: number;
  courseCode: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  exchangeType: 'Borrow' | 'Rent' | 'Buy' | 'Free';
  price: number;
  images: string[];
  fileUrl?: string; // PDF link for E-books or digital notes
  owner: mongoose.Types.ObjectId;
  status: 'Available' | 'Pending' | 'Exchanged';
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  resourceType: {
    type: String,
    enum: ['Textbook', 'Notes', 'Previous Year Paper', 'Lab Manual', 'Project Report', 'E-book/PDF'],
    required: true
  },
  department: { type: String, required: true },
  semester: { type: Number, required: true },
  courseCode: { type: String, required: true, uppercase: true, trim: true },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
    required: true
  },
  exchangeType: {
    type: String,
    enum: ['Borrow', 'Rent', 'Buy', 'Free'],
    required: true
  },
  price: { type: Number, default: 0 },
  images: [{ type: String }],
  fileUrl: { type: String },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['Available', 'Pending', 'Exchanged'],
    default: 'Available'
  }
}, {
  timestamps: true
});

// Search indexes for title, author, courseCode, and department
ResourceSchema.index({ title: 'text', author: 'text', courseCode: 'text', description: 'text' });

export default mongoose.model<IResource>('Resource', ResourceSchema);
