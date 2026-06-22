import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { uploadFile } from '../middleware/upload';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id: string) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'bookbridge_secret_jwt_key_987654321',
    { expiresIn: '30d' }
  );
};

// Check if email has a university domain
const isUniversityEmail = (email: string): boolean => {
  const lowercaseEmail = email.toLowerCase();
  return lowercaseEmail.endsWith('.edu') || lowercaseEmail.endsWith('.ac.in');
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, department, semester, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine verification state based on email domain
    const isUni = isUniversityEmail(email);
    const verificationStatus = isUni ? 'approved' : 'pending';
    const isVerified = isUni;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      department,
      semester,
      phone,
      isVerified,
      verificationStatus,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id.toString()),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        phone: user.phone,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id.toString()),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        phone: user.phone,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'No Google credential token provided' });
    }

    let payload;
    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } else {
      // Mock validation in case Google credentials are not set up locally by developer yet
      // Decode JWT payload locally for seamless demo setup
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      payload = JSON.parse(jsonPayload);
      console.log('Google local token decoded (no Client ID set):', payload);
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: 'Google Authentication failed' });
    }

    const { name, email, picture, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      const isUni = isUniversityEmail(email);
      user = await User.create({
        name: name || 'Google User',
        email,
        googleId,
        avatar: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
        isVerified: isUni,
        verificationStatus: isUni ? 'approved' : 'pending'
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id.toString()),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        phone: user.phone,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user: req.user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadStudentId = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a Student ID photo' });
    }

    const imageUrl = await uploadFile(req.file);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.studentIdImage = imageUrl;
    user.verificationStatus = 'pending';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Student ID card uploaded successfully. Waiting for administrator approval.',
      verificationStatus: 'pending',
      studentIdImage: imageUrl
    });
  } catch (error: any) {
    console.error('ID Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
