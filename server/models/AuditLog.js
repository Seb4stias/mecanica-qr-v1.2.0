const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action_type: {
    type: String,
    required: true,
    enum: [
      'user_login',
      'user_logout', 
      'user_created',
      'user_updated',
      'user_deleted',
      'user_registered',
      'user_role_changed',
      'user_activated',
      'user_deactivated',
      'password_changed',
      'request_created',
      'request_approved_level1',
      'request_approved_level2', 
      'request_rejected',
      'request_deleted',
      'qr_generated',
      'qr_regenerated',
      'qr_scanned',
      'qr_scan_success',
      'qr_scan_failed',
      'admin_action'
    ]
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performed_by_name: {
    type: String,
    required: true
  },
  performed_by_rut: {
    type: String,
    default: null
  },
  target_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  target_user_name: {
    type: String,
    default: null
  },
  target_user_rut: {
    type: String,
    default: null
  },
  target_request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    default: null
  },
  target_request_plate: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  ip_address: {
    type: String,
    default: null
  },
  user_agent: {
    type: String,
    default: null
  },
  additional_data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejorar rendimiento
auditLogSchema.index({ action_type: 1 });
auditLogSchema.index({ performed_by: 1 });
auditLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);