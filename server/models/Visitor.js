import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    hostEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Person to meet is required'],
      index: true,
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of visit is required'],
      trim: true,
    },
    vehicleNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    numberOfVisitors: {
      type: Number,
      default: 1,
      min: [1, 'Number of visitors must be at least 1'],
    },
    materialDetails: {
      type: String,
      default: '',
      trim: true,
    },
    inTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    outTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['INSIDE', 'CHECKED_OUT'],
      default: 'INSIDE',
      index: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    expectedVisitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpectedVisitor',
      default: null,
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fast date-based and status queries
visitorSchema.index({ inTime: -1, status: 1 });

export const Visitor = mongoose.model('Visitor', visitorSchema);
