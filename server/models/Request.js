const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  student_carrera: {
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
  student_phone: {
    type: String,
    required: true,
    trim: true
  },
  activity_type: {
    type: String,
    required: true,
    enum: ['curricular', 'extracurricular']
  },
  activity_description: {
    type: String,
    trim: true,
    default: null
  },
  vehicle_plate: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
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
    required: true,
    trim: true
  },
  modifications_description: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  admin_comments: {
    type: String,
    trim: true,
    default: null
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approved_at: {
    type: Date,
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
requestSchema.pre('save', function() {
  this.updated_at = new Date();
});

module.exports = mongoose.model('Request', requestSchema);