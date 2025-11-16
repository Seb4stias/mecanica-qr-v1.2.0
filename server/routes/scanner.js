const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const db = require('../config/database');

/**
 * POST /api/scanner/validate
 * Validar código QR escaneado
 */
router.post('/validate', requireRole('scanner', 'admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'Datos del QR requeridos'
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Formato de QR inválido'
      });
    }

    const pool = db.getPool();

    // Buscar el QR en la base de datos
    const [qrCodes] = await pool.query(
      `SELECT qr.*, r.student_name, r.student_rut, r.vehicle_plate, r.vehicle_model, r.vehicle_color, r.status, r.vehicle_photo_path
       FROM qr_codes qr
       JOIN requests r ON qr.request_id = r.id
       WHERE qr.request_id = ? AND qr.is_active = 1`,
      [parsedData.requestId]
    );

    if (qrCodes.length === 0) {
      return res.json({
        success: false,
        valid: false,
        message: 'Código QR no encontrado o inactivo'
      });
    }

    const qrCode = qrCodes[0];

    // Verificar si está expirado
    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      return res.json({
        success: true,
        valid: false,
        message: 'Código QR expirado',
        data: {
          studentName: qrCode.student_name,
          studentRut: qrCode.student_rut,
          vehiclePlate: qrCode.vehicle_plate,
          expiresAt: qrCode.expires_at
        }
      });
    }

    // Verificar que la solicitud esté aprobada
    if (qrCode.status !== 'approved') {
      return res.json({
        success: true,
        valid: false,
        message: 'Solicitud no está aprobada',
        data: {
          studentName: qrCode.student_name,
          studentRut: qrCode.student_rut,
          vehiclePlate: qrCode.vehicle_plate,
          status: qrCode.status
        }
      });
    }

    // QR válido
    res.json({
      success: true,
      valid: true,
      message: 'Acceso autorizado',
      data: {
        studentName: qrCode.student_name,
        studentRut: qrCode.student_rut,
        vehiclePlate: qrCode.vehicle_plate,
        vehicleModel: qrCode.vehicle_model,
        vehicleColor: qrCode.vehicle_color,
        vehiclePhotoPath: qrCode.vehicle_photo_path,
        expiresAt: qrCode.expires_at
      }
    });

    // Registrar el escaneo en audit_logs
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'qr_scan', 'qr_code', ?, ?)`,
      [req.session.userId, qrCode.id, JSON.stringify({ valid: true, plate: qrCode.vehicle_plate })]
    );

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
    const pool = db.getPool();
    const [logs] = await pool.query(
      `SELECT al.*, u.name as scanner_name
       FROM audit_logs al
       JOIN users u ON al.user_id = u.id
       WHERE al.action = 'qr_scan'
       ORDER BY al.created_at DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      history: logs
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
