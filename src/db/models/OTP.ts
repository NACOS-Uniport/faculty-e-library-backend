import { Schema, Document, model } from 'mongoose';

interface IOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
}

const otpSchema = new Schema<IOTP>({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, default: Date.now, expires: 600 },
});

const otpModel = model('OTP', otpSchema);

export default otpModel;
