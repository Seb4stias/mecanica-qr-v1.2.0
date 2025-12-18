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
      'request_created',
      'request_approved',
      'request_rejected',
      'qr_generated',
      'qr_scanned',
      'admin_action'
    ]
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  target_request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
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