import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// Ensure the local uploads directory exists
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Local Storage Configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File Filter configuration
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP images and PDF files are allowed.'), false);
  }
};

export const upload = multer({
  storage: localStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Configure Cloudinary if keys are present in env
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Upload helper function that strictly handles Cloudinary uploads
export const uploadFile = async (file: Express.Multer.File): Promise<string> => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment credentials are missing or unconfigured.');
  }

  const result = await cloudinary.uploader.upload(file.path, {
    folder: 'bookbridge',
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image'
  });
  
  // Delete local temporary file created by multer
  fs.unlinkSync(file.path);
  return result.secure_url;
};
