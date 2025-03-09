import mongoose, { Document } from 'mongoose';

export interface IMaterial extends Document {
  level: string;
  courseCode: string;
  courseTitle: string;
  pdfUrl: string;
  description: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
    },
    courseTitle: {
      type: String,
      required: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMaterial>('Material', MaterialSchema);
