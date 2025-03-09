import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../db/models/User.js';
import OTP from '../db/models/OTP.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Store OTPs temporarily (in production, consider using Redis)
interface OtpStore {
  [email: string]: {
    otp: string;
    expiresAt: Date;
  };
}

const otpStore: OtpStore = {};

// Generate a random 6-digit OTP
// Interface for token data
export interface TokenData {
  id: string;
  email: string;
}

// Generate a random 6-digit OTP
export const generateOTP = async (email: string): Promise<string> => {
  // Generate new OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const now = Date.now();

  await OTP.findOneAndUpdate({ email }, { $set: { otp, expiresAt: now } });
  // Set OTP expiration time (10 minutes)
  const OTP_EXPIRY_MINUTES = 10;

  // Send OTP via email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Login',
    text: `Your OTP for login is: ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your OTP for login is: <strong>${otp}</strong></p><p>It will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  };

  await transporter.sendMail(mailOptions);

  return otp;
};

// Configure email transport (should be moved to env variables in production)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send OTP via email
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Generate new OTP
    const otp = generateOTP(email);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
    });
  }
};

// Verify if an OTP is valid for a given email
export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  // Check if OTP exists for this email
  const otpData = await OTP.findOne({ email });

  if (!otpData) {
    return false;
  }

  // Check if OTP matches
  if (otpData.otp !== otp) {
    return false;
  }

  await otpData.deleteOne();

  return true;
};

// Create JWT token for a user
export const createToken = (userData: TokenData): string => {
  return jwt.sign(userData, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '10d' });
};

// Verify OTP and login route handler
export const verifyOTPAndLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP are required' });
      return;
    }

    // Check if OTP exists for this email
    const otpData = await OTP.findOne({ email });

    if (!otpData) {
      res.status(400).json({ success: false, message: 'No OTP was generated for this email' });
      return;
    }

    // Check if OTP matches
    if (otpData.otp !== otp) {
      res.status(400).json({ success: false, message: 'Invalid OTP' });
      return;
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Generate JWT token
    const token = createToken({
      id: user._id as string,
      email: user.email,
    });

    await otpData.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
    });
  }
};

// Middleware to protect routes
export const authenticate = (req: Request & { user?: any }, res: Response, next: NextFunction): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authorization token is required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      id: string;
      email: string;
      role: string;
    };

    // Add user info to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

// Middleware to check if user is admin
export const isAdmin = (req: Request & { user?: any }, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied: Admin permissions required',
    });
  }
};
