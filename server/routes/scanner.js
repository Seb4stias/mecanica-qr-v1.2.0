const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireRole } = require('../middleware/auth');
const Request = require('../models/Request');
const QRCodeModel = require('../models/QRCode');
const AuditLog = require('../models/AuditLog');

/**
 * POST /api/scanner/validate
 * Validar código QR escaneado
 */
router.post('/validate', requireRole('scanner', 'admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const { qrData } = req.body;
    
    console.log('🔍 === SCANNER DEBUG START ===');
    console.log('🔍 QR Data recibido:', qrData);

    if (!qrData) {
      console.log('❌ No hay qrData');
      return res.status(400).json({
        success: false,
        message: 'Datos del QR requeridos'
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
      console.log('🔍 Datos parseados:', parsedData);
    } catch (e) {
      console.log('❌ Error parseando QR:', e.message);
      return res.status(400).json({
        success: false,
        message: 'Formato de QR inválido'
      });
    }

    console.log('🔍 Buscando requestId:', parsedData.requestId);
    
    // Buscar TODOS los QRs para debug
    const allQRs = await QRCodeModel.find({}).limit(5);
    console.log('🔍 Total QRs en BD:', allQRs.length);
    allQRs.forEach((qr, i) => {
      console.log(`🔍 QR ${i+1}: request_id=${qr.request_id}, active=${qr.is_active}`);
    });
    
    // Buscar el QR específico
    const qrCode = await QRCodeModel.findOne({
      request_id: parsedData.requestId,
      is_active: true
    }).populate('request_id');
    
    console.log('🔍 QR encontrado:', qrCode ? 'SÍ' : 'NO');
    
    if (!qrCode) {
      console.log('❌ QR no encontrado');
      console.log('🔍 === SCANNER DEBUG END ===');
      return res.json({
        success: false,
        valid: false,
        message: 'Código QR no encontrado o inactivo'
      });
    }

    const request = qrCode.request_id;
    console.log('🔍 Request status:', request.status);

    // Verificar que la solicitud esté aprobada
    if (request.status !== 'approved') {
      console.log('❌ Request no aprobada');
      console.log('🔍 === SCANNER DEBUG END ===');
      return res.json({
        success: true,
        valid: false,
        message: 'Solicitud no está aprobada',
        data: {
          studentName: request.student_name,
          vehiclePlate: request.vehicle_plate,
          status: request.status
        }
      });
    }

    console.log('✅ QR VÁLIDO');
    console.log('🔍 === SCANNER DEBUG END ===');
    
    // QR válido
    res.json({
      success: true,
      valid: true,
      message: 'Acceso autorizado',
      data: {
        studentName: request.student_name,
        studentRut: request.student_rut,
        vehiclePlate: request.vehicle_plate,
        vehicleModel: request.vehicle_model,
        vehicleColor: request.vehicle_color,
        vehiclePhotoPath: request.vehicle_photo_path,
        vehicleIdPhotoPath: request.vehicle_id_photo_path,
        expiresAt: qrCode.expires_at
      }
    });

  } catch (error) {
    console.log('❌ ERROR EN SCANNER:', error);
    next(error);
  }
});

/**
 * GET /api/scanner/history
 * Obtener historial de escaneos
 */
router.get('/history', requireRole('scanner', 'admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ action_type: 'qr_scan' })
      .populate('performed_by', 'name email')
      .sort({ created_at: -1 })
      .limit(100);

    res.json({
      success: true,
      history: logs
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
