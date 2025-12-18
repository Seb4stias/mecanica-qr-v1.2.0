const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true,
    unique: true
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
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QRCode', qrCodeSchema);