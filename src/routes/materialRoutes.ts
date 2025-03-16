import express from 'express';
import * as MaterialController from '../controllers/MaterialController.js';
import upload from '../middleware/multer.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all materials
router.get('/', MaterialController.getAllMaterials);

// Get a single material by ID
router.get('/:id', MaterialController.getMaterialById);

// Create a new material (requires authentication)
router.post('/', authenticate, upload.single('material'), MaterialController.createMaterial);

// Update a material (requires authentication)
router.put('/:id', authenticate, upload.single('material'), MaterialController.updateMaterial);

// Delete a material (requires authentication)
router.delete('/:id', authenticate, MaterialController.deleteMaterial);

export default router;
