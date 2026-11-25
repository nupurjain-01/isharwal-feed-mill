import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    designation: {
      type: String,
      default: 'Staff',
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Virtual index for fast search by name
employeeSchema.index({ name: 'text', employeeCode: 'text', email: 'text' });

export const Employee = mongoose.model('Employee', employeeSchema);
