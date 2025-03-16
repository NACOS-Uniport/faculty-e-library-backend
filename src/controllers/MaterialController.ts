import { Request, Response } from 'express';
import Material from '../db/models/Material.js';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));

const s3Client = new S3Client({
  region: process.env.SCW_REGION || 'fr-par',

  endpoint: process.env.SCW_ENDPOINT || 'https://s3.fr-par.scw.cloud',
  credentials: {
    accessKeyId: process.env.SCW_ACCESS_KEY,
    secretAccessKey: process.env.SCW_SECRET_KEY,
  },
});

// Create a new material with PDF upload
export const createMaterial = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Please upload a PDF file' });
      return;
    }

    const { level, courseCode, courseTitle, description } = req.body;

    // Validate required fields
    if (!level || !courseCode || !courseTitle) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    const url = `${level}/${courseCode}/${Date.now()}_${req.file.originalname}`;
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    const params = {
      Bucket: process.env.SCW_BUCKET_NAME,
      Key: url, // Unique filename
      Body: bufferStream,
      ContentType: req.file.mimetype,
    };

    const upload = new Upload({ params, client: s3Client });
    await upload.done();

    const material = new Material({
      level,
      courseCode,
      courseTitle,
      url: `https://foc-library.s3.fr-par.scw.cloud/${url}`,
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
    const level = req.query.level;
    const courseCode = req.query['course-code'];
    // Filter for only approved materials unless request specifies otherwise
    const approved = req.query.approved === 'false' ? false : true;

    const materials = await Material.find({ level, courseCode, approved });
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
      res.status(404).json({ message: 'Material not found' });
      return;
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
      res.status(404).json({ message: 'Material not found' });
      return;
    }

    // Update file if provided
    let url = material.url;
    if (req.file) {
      // Remove old file if it exists
      if (material.url) {
        const oldFilePath = path.join(__dirname, '../../', material.url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      url = `/uploads/${req.file.filename}`;
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      {
        level: level || material.level,
        courseCode: courseCode || material.courseCode,
        courseTitle: courseTitle || material.courseTitle,
        url,
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
      res.status(404).json({ message: 'Material not found' });
      return;
    }

    // Delete the PDF file
    if (material.url) {
      const filePath = path.join(__dirname, '../../', material.url);
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
      res.status(404).json({ message: 'Material not found' });
      return;
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
