const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const db = require('../config/database');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/admin/requests
 * Obtener todas las solicitudes (para administradores)
 */
router.get('/requests', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const pool = db.getPool();
    
    let query = 'SELECT r.*, u.name as user_name, u.email as user_email FROM requests r JOIN users u ON r.user_id = u.id';
    const params = [];
    
    if (status) {
      const statuses = status.split(',');
      query += ' WHERE r.status IN (' + statuses.map(() => '?').join(',') + ')';
      params.push(...statuses);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const [requests] = await pool.query(query, params);

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/requests/:id
 * Obtener detalle de una solicitud específica
 */
router.get('/requests/:id', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const pool = db.getPool();
    const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }
    
    res.json({
      success: true,
      request: requests[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/requests/:id/approve
 * Aprobar solicitud (nivel 1 o 2)
 */
router.post('/requests/:id/approve', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const { comments } = req.body;
    const requestId = req.params.id;
    const adminLevel = req.session.userRole === 'admin_level1' ? 1 : 2;
    const pool = db.getPool();

    console.log(`📝 Admin nivel ${adminLevel} (ID: ${req.session.userId}) aprobando solicitud ${requestId}`);

    // Obtener solicitud actual
    const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    const request = requests[0];

    // Verificar que no esté ya rechazada
    if (request.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'No se puede aprobar una solicitud rechazada'
      });
    }

    if (adminLevel === 1) {
      // Verificar que no esté ya aprobada por nivel 1
      if (request.level1_approved) {
        return res.status(400).json({
          success: false,
          message: 'Esta solicitud ya fue aprobada por nivel 1'
        });
      }

      // Aprobación nivel 1
      await pool.query(
        `UPDATE requests SET 
          level1_approved = 1,
          level1_admin_id = ?,
          level1_date = NOW(),
          level1_comments = ?,
          status = 'level1_approved'
        WHERE id = ?`,
        [req.session.userId, comments || '', requestId]
      );

      console.log(`✅ Solicitud ${requestId} aprobada por nivel 1`);
    } else {
      // Aprobación nivel 2 (final)
      if (!request.level1_approved) {
        return res.status(400).json({
          success: false,
          message: 'La solicitud debe ser aprobada por nivel 1 primero'
        });
      }

      if (request.level2_approved) {
        return res.status(400).json({
          success: false,
          message: 'Esta solicitud ya fue aprobada por nivel 2'
        });
      }

      await pool.query(
        `UPDATE requests SET 
          level2_approved = 1,
          level2_admin_id = ?,
          level2_date = NOW(),
          level2_comments = ?,
          status = 'approved'
        WHERE id = ?`,
        [req.session.userId, comments || '', requestId]
      );

      console.log(`✅ Solicitud ${requestId} aprobada por nivel 2 - Generando QR...`);

      // Generar QR
      try {
        await generateQRCode(requestId, request);
        console.log(`✅ QR generado para solicitud ${requestId}`);
      } catch (qrError) {
        console.error(`❌ Error generando QR:`, qrError);
        // No fallar la aprobación si el QR falla
      }
    }

    res.json({
      success: true,
      message: `Solicitud aprobada exitosamente por nivel ${adminLevel}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/requests/:id/reject
 * Rechazar solicitud (cualquier nivel puede rechazar)
 */
router.post('/requests/:id/reject', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const requestId = req.params.id;
    const adminLevel = req.session.userRole === 'admin_level1' ? 1 : 2;
    const pool = db.getPool();

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una razón para rechazar'
      });
    }

    console.log(`❌ Admin nivel ${adminLevel} (ID: ${req.session.userId}) rechazando solicitud ${requestId}`);

    // Verificar que la solicitud existe
    const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Rechazar la solicitud
    await pool.query(
      `UPDATE requests SET 
        status = 'rejected',
        denial_reason = ?,
        denied_by_level = ?
      WHERE id = ?`,
      [reason, adminLevel, requestId]
    );

    console.log(`✅ Solicitud ${requestId} rechazada por nivel ${adminLevel}`);

    res.json({
      success: true,
      message: 'Solicitud rechazada'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Función auxiliar para generar código QR
 */
async function generateQRCode(requestId, requestData) {
  const pool = db.getPool();
  
  const qrData = JSON.stringify({
    requestId: requestId,
    plate: requestData.vehicle_plate,
    studentName: requestData.student_name,
    studentRut: requestData.student_rut,
    generatedAt: new Date().toISOString()
  });

  // Generar imagen QR
  const qrImagePath = `public/qr-codes/qr-${requestId}.png`;
  await QRCode.toFile(qrImagePath, qrData);

  // Generar PDF
  const pdfPath = `public/qr-codes/permit-${requestId}.pdf`;
  await generatePDF(requestData, qrImagePath, pdfPath);

  // Calcular fecha de expiración
  const expiryDays = parseInt(process.env.QR_EXPIRY_DAYS) || 30;
  const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

  // Guardar en base de datos
  await pool.query(
    `INSERT INTO qr_codes (request_id, qr_data, qr_image_path, pdf_path, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [requestId, qrData, `/qr-codes/qr-${requestId}.png`, `/qr-codes/permit-${requestId}.pdf`, expiresAt]
  );
}

/**
 * Función auxiliar para generar PDF
 */
async function generatePDF(requestData, qrImagePath, pdfPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(20).text('Permiso de Acceso Vehicular', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Estudiante: ${requestData.student_name}`);
    doc.text(`RUT: ${requestData.student_rut}`);
    doc.text(`Patente: ${requestData.vehicle_plate}`);
    doc.text(`Modelo: ${requestData.vehicle_model}`);
    doc.text(`Color: ${requestData.vehicle_color}`);
    doc.moveDown();
    doc.image(qrImagePath, { width: 200, align: 'center' });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = router;
