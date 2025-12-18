const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  qr_code: {
    type: String,
    required: true,
    unique: true
  },
  qr_image_path: {
    type: String,
    required: true
  },
  pdf_path: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    default: null
  }
});

// Índice para búsquedas rápidas por código QR
qrCodeSchema.index({ qr_code: 1 });
qrCodeSchema.index({ request_id: 1 });

module.exports = mongoose.model('QRCode', qrCodeSchema);