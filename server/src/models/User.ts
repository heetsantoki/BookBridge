import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar: string;
  role: 'student' | 'admin';
  department?: string;
  semester?: number;
  phone?: string;
  googleId?: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  studentIdImage?: string;
  isEmailVerified: boolean;
  emailOtp?: string;
  emailOtpExpires?: Date;
  wishlist: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  department: { type: String },
  semester: { type: Number },
  phone: { type: String },
  googleId: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  studentIdImage: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  emailOtp: { type: String },
  emailOtpExpires: { type: Date },
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Resource' }]
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
