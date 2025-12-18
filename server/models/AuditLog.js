const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action_type: {
    type: String,
    required: true,
    trim: true
  },
  action_description: {
    type: String,
    required: true
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
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Índices para búsquedas rápidas
auditLogSchema.index({ performed_by: 1, created_at: -1 });
auditLogSchema.index({ action_type: 1, created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);