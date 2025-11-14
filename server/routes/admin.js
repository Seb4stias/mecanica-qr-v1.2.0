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
      query += ' WHERE r.status = ?';
      params.push(status);
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
 * POST /api/admin/requests/:id/approve
 * Aprobar solicitud (nivel 1 o 2)
 */
router.post('/requests/:id/approve', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const { comments } = req.body;
    const requestId = req.params.id;
    const adminLevel = req.session.userRole === 'admin_level1' ? 1 : 2;
    const pool = db.getPool();

    // Obtener solicitud actual
    const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    const request = requests[0];

    if (adminLevel === 1) {
      // Aprobación nivel 1
      await pool.query(
        `UPDATE requests SET 
          level1_approved = 1,
          level1_admin_id = ?,
          level1_date = NOW(),
          level1_comments = ?,
          status = 'level1_approved'
        WHERE id = ?`,
        [req.session.userId, comments, requestId]
      );
    } else {
      // Aprobación nivel 2 (final)
      if (!request.level1_approved) {
        return res.status(400).json({
          success: false,
          message: 'La solicitud debe ser aprobada por nivel 1 primero'
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
        [req.session.userId, comments, requestId]
      );

      // Generar QR
      await generateQRCode(requestId, request);
    }

    res.json({
      success: true,
      message: 'Solicitud aprobada exitosamente'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/requests/:id/reject
 * Rechazar solicitud
 */
router.post('/requests/:id/reject', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const requestId = req.params.id;
    const adminLevel = req.session.userRole === 'admin_level1' ? 1 : 2;
    const pool = db.getPool();

    await pool.query(
      `UPDATE requests SET 
        status = 'rejected',
        denial_reason = ?,
        denied_by_level = ?
      WHERE id = ?`,
      [reason, adminLevel, requestId]
    );

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
