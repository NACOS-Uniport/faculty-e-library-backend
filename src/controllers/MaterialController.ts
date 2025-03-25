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

/**
 * @swagger
 * /api/v1/materials:
 *   post:
 *     summary: Create a new material
 *     description: Upload a new material with PDF file
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - level
 *               - courseCode
 *               - courseTitle
 *               - description
 *               - material
 *             properties:
 *               level:
 *                 type: string
 *                 description: Study level
 *               courseCode:
 *                 type: string
 *                 description: Course code
 *               courseTitle:
 *                 type: string
 *                 description: Course title
 *               description:
 *                 type: string
 *                 description: Material description
 *               material:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload
 *     responses:
 *       201:
 *         description: Material created successfully
 *       400:
 *         description: Invalid input or missing file
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/v1/materials:
 *   get:
 *     summary: Get all materials
 *     description: Retrieve a list of materials with optional filtering
 *     tags: [Materials]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *         description: Filter by level
 *       - in: query
 *         name: course-code
 *         schema:
 *           type: string
 *         description: Filter by course code
 *       - in: query
 *         name: approved
 *         schema:
 *           type: boolean
 *         description: Filter by approval status (default is true)
 *     responses:
 *       200:
 *         description: List of materials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Material'
 *       500:
 *         description: Server error
 */
export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    const level = req.query.level;
    const courseCode = req.query['course-code'] as string;
    // Filter for only approved materials unless request specifies otherwise
    const approved = req.query.approved === 'false' ? false : true;

    // Build query object conditionally
    let query: any = { approved };

    if (level) {
      query.level = Number(level);
    }

    if (courseCode) {
      query.courseCode = { $regex: new RegExp(courseCode, 'i') };
    }

    const materials = await Material.find(query);
    res.status(200).json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Error fetching materials', error: error.message });
  }
};

/**
 * @swagger
 * /api/v1/materials/{id}:
 *   get:
 *     summary: Get material by ID
 *     description: Retrieve a specific material by its ID
 *     tags: [Materials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material ID
 *     responses:
 *       200:
 *         description: Material details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Material'
 *       404:
 *         description: Material not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/v1/materials/{id}:
 *   put:
 *     summary: Update material
 *     description: Update an existing material
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *               courseCode:
 *                 type: string
 *               courseTitle:
 *                 type: string
 *               approved:
 *                 type: boolean
 *               material:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated material
 *       404:
 *         description: Material not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/v1/materials/{id}:
 *   delete:
 *     summary: Delete material
 *     description: Delete a material by ID
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material ID
 *     responses:
 *       200:
 *         description: Material deleted successfully
 *       404:
 *         description: Material not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/v1/materials/{id}/approve:
 *   patch:
 *     summary: Toggle approval status
 *     description: Toggle the approval status of a material
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material ID
 *     responses:
 *       200:
 *         description: Material approval status updated
 *       404:
 *         description: Material not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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
