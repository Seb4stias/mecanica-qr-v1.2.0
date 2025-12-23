const express = require('express');
const router = express.Router();
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
    
    console.log('🔍 SCANNER DEBUG - QR Data recibido:', qrData);

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'Datos del QR requeridos'
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
      console.log('🔍 SCANNER DEBUG - Datos parseados:', parsedData);
    } catch (e) {
      console.log('❌ SCANNER DEBUG - Error parseando QR:', e.message);
      return res.status(400).json({
        success: false,
        message: 'Formato de QR inválido'
      });
    }

    console.log('🔍 SCANNER DEBUG - Buscando QR con requestId:', parsedData.requestId);
    
    // Buscar el QR en la base de datos
    const qrCode = await QRCodeModel.findOne({
      request_id: parsedData.requestId,
      is_active: true
    }).populate('request_id');
    
    console.log('🔍 SCANNER DEBUG - QR encontrado:', qrCode ? 'SÍ' : 'NO');
    
    if (qrCode) {
      console.log('🔍 SCANNER DEBUG - QR ID:', qrCode._id);
      console.log('🔍 SCANNER DEBUG - Request ID en BD:', qrCode.request_id._id);
      console.log('🔍 SCANNER DEBUG - Is Active:', qrCode.is_active);
    }

    if (!qrCode) {
      // Buscar todos los QRs para debug
      const allQRs = await QRCodeModel.find({}).limit(5);
      console.log('🔍 SCANNER DEBUG - Total QRs en BD:', allQRs.length);
      allQRs.forEach((qr, index) => {
        console.log(`🔍 SCANNER DEBUG - QR ${index + 1}: ID=${qr.request_id}, Active=${qr.is_active}`);
      });
      
      return res.json({
        success: false,
        valid: false,
        message: 'Código QR no encontrado o inactivo'
      });
    }

    const request = qrCode.request_id;

    // Verificar si está expirado
    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      return res.json({
        success: true,
        valid: false,
        message: 'Código QR expirado',
        data: {
          studentName: request.student_name,
          studentRut: request.student_rut,
          vehiclePlate: request.vehicle_plate,
          expiresAt: qrCode.expires_at
        }
      });
    }

    // Verificar que la solicitud esté aprobada
    if (request.status !== 'approved') {
      return res.json({
        success: true,
        valid: false,
        message: 'Solicitud no está aprobada',
        data: {
          studentName: request.student_name,
          studentRut: request.student_rut,
          vehiclePlate: request.vehicle_plate,
          status: request.status
        }
      });
    }

    // QR válido
    console.log('✅ QR válido - Foto del vehículo:', request.vehicle_photo_path);
    
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

    // Registrar el escaneo en audit_logs
    const auditLog = new AuditLog({
      action_type: 'qr_scan',
      action_description: `QR escaneado para vehículo ${request.vehicle_plate}`,
      performed_by: req.session.userId,
      metadata: { valid: true, plate: request.vehicle_plate }
    });
    await auditLog.save();

  } catch (error) {
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
