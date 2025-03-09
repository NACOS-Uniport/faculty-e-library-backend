import express from 'express';
import User from '../db/models/User.js';
import { generateOTP, verifyOTP, createToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for login
 * @access  Public
 */
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and send OTP
    const otp = await generateOTP(email);

    return res.status(200).json({
      message: 'OTP sent successfully',
      email,
    });
  } catch (error) {
    console.error('Error in requesting OTP:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login user
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const isValid = verifyOTP(email, otp);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Get user data for response
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create JWT token using the auth middleware
    const token = createToken({
      id: user._id as string,
      email: user.email,
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error in verifying OTP:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
