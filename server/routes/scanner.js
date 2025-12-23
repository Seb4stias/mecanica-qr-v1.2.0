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
router.post('/validate', async (req, res, next) => {
  try {
    console.log('🔍 === SCANNER VALIDATE START ===');
    console.log('🔍 Body completo:', req.body);
    console.log('🔍 Headers:', req.headers);
    
    const { qrData } = req.body;
    
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
    console.log('🔍 Tipo de requestId:', typeof parsedData.requestId);
    
    // Primero buscar TODOS los QRs para comparar
    const allQRs = await QRCodeModel.find({});
    console.log('🔍 TODOS los QRs en BD:');
    allQRs.forEach((qr, i) => {
      console.log(`   QR ${i+1}: request_id="${qr.request_id}" (tipo: ${typeof qr.request_id}), active=${qr.is_active}`);
      console.log(`   ¿Coincide exacto? ${qr.request_id === parsedData.requestId ? 'SÍ' : 'NO'}`);
      console.log(`   ¿Coincide toString? ${qr.request_id.toString() === parsedData.requestId ? 'SÍ' : 'NO'}`);
    });
    
    // Buscar el QR específico
    const qrCode = await QRCodeModel.findOne({
      request_id: parsedData.requestId,
      is_active: true
    }).populate('request_id');
    
    console.log('🔍 Resultado búsqueda:', qrCode ? 'ENCONTRADO' : 'NO ENCONTRADO');
    
    if (!qrCode) {
      // Intentar sin el filtro is_active
      const qrWithoutActive = await QRCodeModel.findOne({
        request_id: parsedData.requestId
      });
      console.log('🔍 Sin filtro is_active:', qrWithoutActive ? 'ENCONTRADO' : 'NO ENCONTRADO');
      if (qrWithoutActive) {
        console.log('🔍 is_active del QR encontrado:', qrWithoutActive.is_active);
      }
    }
    
    console.log('🔍 QR encontrado:', qrCode ? 'SÍ' : 'NO');
    
    if (!qrCode) {
      console.log('❌ QR no encontrado');
      return res.json({
        success: false,
        valid: false,
        message: 'Código QR no encontrado o inactivo'
      });
    }

    const request = qrCode.request_id;
    console.log('🔍 Request status:', request.status);

    if (request.status !== 'approved') {
      console.log('❌ Request no aprobada');
      return res.json({
        success: true,
        valid: false,
        message: 'Solicitud no está aprobada'
      });
    }

    console.log('✅ QR VÁLIDO - ACCESO AUTORIZADO');
    
    res.json({
      success: true,
      valid: true,
      message: 'Acceso autorizado',
      data: {
        studentName: request.student_name,
        studentRut: request.student_rut,
        vehiclePlate: request.vehicle_plate,
        vehicleModel: request.vehicle_model,
        vehicleColor: request.vehicle_color
      }
    });

  } catch (error) {
    console.log('❌ ERROR EN SCANNER:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
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
