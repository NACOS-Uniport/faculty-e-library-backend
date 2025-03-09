import { Router } from 'express';
import materialRoutes from './materialRoutes.js';
import authRoutes from './authRoutes.js';

const router = Router();

// Register all routes
router.use('/materials', materialRoutes);
router.use('/auth', authRoutes);

export default router;
