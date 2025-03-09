import { Request, Response } from 'express';
import Material from '../db/models/Material.js';
import path from 'path';
import fs from 'fs';
import upload from '../middleware/multer.js';

// Create a new material with PDF upload
export const createMaterial = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file' });
    }

    const { level, courseCode, courseTitle, description } = req.body;

    // Validate required fields
    if (!level || !courseCode || !courseTitle) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const pdfUrl = `/uploads/${req.file.filename}`;

    const material = new Material({
      level,
      courseCode,
      courseTitle,
      pdfUrl,
      description,
      approved: false, // Default to false, admin will approve later
    });

    const savedMaterial = await material.save();
    res.status(201).json(savedMaterial);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ message: 'Error creating material', error: error.message });
  }
};

// Get all materials
export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    // Filter for only approved materials unless request specifies otherwise
    const approved = req.query.approved === 'false' ? false : true;
    const query = approved ? { approved: true } : {};

    const materials = await Material.find(query);
    res.status(200).json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Error fetching materials', error: error.message });
  }
};

// Get a single material by ID
export const getMaterialById = async (req: Request, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.status(200).json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ message: 'Error fetching material', error: error.message });
  }
};

// Update a material
export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const { level, courseCode, courseTitle, approved } = req.body;

    // Get existing material
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Update file if provided
    let pdfUrl = material.pdfUrl;
    if (req.file) {
      // Remove old file if it exists
      if (material.pdfUrl) {
        const oldFilePath = path.join(__dirname, '../../', material.pdfUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      pdfUrl = `/uploads/${req.file.filename}`;
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      {
        level: level || material.level,
        courseCode: courseCode || material.courseCode,
        courseTitle: courseTitle || material.courseTitle,
        pdfUrl,
        approved: approved !== undefined ? approved : material.approved,
      },
      { new: true }
    );

    res.status(200).json(updatedMaterial);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ message: 'Error updating material', error: error.message });
  }
};

// Delete a material
export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Delete the PDF file
    if (material.pdfUrl) {
      const filePath = path.join(__dirname, '../../', material.pdfUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Material.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ message: 'Error deleting material', error: error.message });
  }
};

// Toggle approval status
export const toggleApproval = async (req: Request, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      { approved: !material.approved },
      { new: true }
    );

    res.status(200).json(updatedMaterial);
  } catch (error) {
    console.error('Error toggling approval:', error);
    res.status(500).json({ message: 'Error toggling approval', error: error.message });
  }
};
