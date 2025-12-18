const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  student_name: {
    type: String,
    required: true,
    trim: true
  },
  student_rut: {
    type: String,
    required: true,
    trim: true
  },
  student_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  student_carrera: {
    type: String,
    trim: true,
    default: null
  },
  student_phone: {
    type: String,
    trim: true,
    default: null
  },
  vehicle_plate: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  vehicle_model: {
    type: String,
    required: true,
    trim: true
  },
  vehicle_color: {
    type: String,
    required: true,
    trim: true
  },
  vehicle_photo_path: {
    type: String,
    default: null
  },
  vehicle_id_photo_path: {
    type: String,
    default: null
  },
  garage_location: {
    type: String,
    trim: true,
    default: null
  },
  modifications_description: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'level1_approved', 'level2_approved', 'approved', 'rejected'],
    default: 'pending'
  },
  level1_approved: {
    type: Boolean,
    default: false
  },
  level1_approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  level1_approved_at: {
    type: Date,
    default: null
  },
  level1_comments: {
    type: String,
    default: null
  },
  level2_approved: {
    type: Boolean,
    default: false
  },
  level2_approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  level2_approved_at: {
    type: Date,
    default: null
  },
  level2_comments: {
    type: String,
    default: null
  },
  rejection_reason: {
    type: String,
    default: null
  },
  rejected_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejected_at: {
    type: Date,
    default: null
  },
  denial_reason: {
    type: String,
    default: null
  },
  denied_by_level: {
    type: Number,
    enum: [1, 2],
    default: null
  },
  created_by_admin: {
    type: Boolean,
    default: false
  },
  created_by_admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updated_at
requestSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Request', requestSchema);