import express from 'express';
import User from '../db/models/User.js';
import { generateOTP, verifyOTP, createToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    User registration
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      res.status(400).json({ message: 'User already exists', success: false });
      return;
    }

    const emailDomain = (email as string).split('@')[1];

    if (emailDomain !== 'uniport.edu.ng') {
      res.status(400).json({ message: 'Not a valid Uniport Email', success: false });
      return;
    }

    user = await User.create({ email });

    // Generate and send OTP
    const otp = await generateOTP(email);

    res.status(200).json({
      message: 'OTP sent successfully',
      email,
    });
  } catch (error) {
    console.error('Error in requesting OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for login
 * @access  Public
 */
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({ message: 'User not found', success: false });
      return;
    }

    // Generate and send OTP
    const otp = await generateOTP(email);

    res.status(200).json({
      message: 'OTP sent successfully',
      email,
    });
  } catch (error) {
    console.error('Error in requesting OTP:', error);
    res.status(500).json({ message: 'Server error' });
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
      res.status(400).json({ message: 'Email and OTP are required' });
      return;
    }

    // Verify OTP
    const isValid = await verifyOTP(email, otp);

    if (!isValid) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Get user data for response
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Create JWT token using the auth middleware
    const token = createToken({
      id: user._id as string,
      email: user.email,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error in verifying OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
