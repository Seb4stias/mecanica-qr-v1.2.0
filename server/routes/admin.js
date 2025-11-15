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
    
    let query = `
      SELECT r.*, 
             u.name as user_name, 
             u.email as user_email,
             admin1.name as level1_admin_name,
             admin2.name as level2_admin_name,
             CASE 
               WHEN r.denied_by_level = 1 THEN admin1.name
               WHEN r.denied_by_level = 2 THEN admin2.name
               ELSE NULL
             END as rejected_by_name
      FROM requests r 
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users admin1 ON r.level1_admin_id = admin1.id
      LEFT JOIN users admin2 ON r.level2_admin_id = admin2.id
    `;
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
      // Admin nivel 1 solo puede aprobar nivel 1
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
          level1_comments = ?
        WHERE id = ?`,
        [req.session.userId, comments || '', requestId]
      );

      console.log(`✅ Solicitud ${requestId} aprobada por nivel 1`);

      // Volver a consultar para verificar si nivel 2 ya aprobó
      const [updatedRequests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
      const updatedRequest = updatedRequests[0];

      console.log(`🔍 Estado después de aprobar nivel 1: level1=${updatedRequest.level1_approved}, level2=${updatedRequest.level2_approved}`);

      // Si AMBOS niveles están aprobados, cambiar estado a 'approved' y generar QR
      if (updatedRequest.level1_approved === 1 && updatedRequest.level2_approved === 1) {
        await pool.query(
          `UPDATE requests SET status = 'approved' WHERE id = ?`,
          [requestId]
        );
        
        console.log(`✅ Solicitud ${requestId} COMPLETAMENTE APROBADA - Generando QR...`);

        // Generar QR
        try {
          await generateQRCode(requestId, updatedRequest);
          console.log(`✅ QR generado para solicitud ${requestId}`);
        } catch (qrError) {
          console.error(`❌ Error generando QR:`, qrError);
        }
      } else {
        // Solo nivel 1 aprobado, falta nivel 2
        await pool.query(
          `UPDATE requests SET status = 'level1_approved' WHERE id = ?`,
          [requestId]
        );
        console.log(`✅ Solicitud ${requestId} aprobada por nivel 1, falta nivel 2`);
      }
    } else {
      // Admin nivel 2 solo puede aprobar nivel 2
      if (request.level2_approved) {
        return res.status(400).json({
          success: false,
          message: 'Esta solicitud ya fue aprobada por nivel 2'
        });
      }

      // Aprobar nivel 2
      await pool.query(
        `UPDATE requests SET 
          level2_approved = 1,
          level2_admin_id = ?,
          level2_date = NOW(),
          level2_comments = ?
        WHERE id = ?`,
        [req.session.userId, comments || '', requestId]
      );

      console.log(`✅ Solicitud ${requestId} aprobada por nivel 2`);

      // Volver a consultar la solicitud para obtener el estado actualizado
      const [updatedRequests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
      const updatedRequest = updatedRequests[0];

      console.log(`🔍 Estado después de aprobar nivel 2: level1=${updatedRequest.level1_approved}, level2=${updatedRequest.level2_approved}`);

      // Si AMBOS niveles están aprobados, cambiar estado a 'approved' y generar QR
      if (updatedRequest.level1_approved === 1 && updatedRequest.level2_approved === 1) {
        await pool.query(
          `UPDATE requests SET status = 'approved' WHERE id = ?`,
          [requestId]
        );
        
        console.log(`✅ Solicitud ${requestId} COMPLETAMENTE APROBADA - Generando QR...`);

        // Generar QR
        try {
          await generateQRCode(requestId, updatedRequest);
          console.log(`✅ QR generado para solicitud ${requestId}`);
        } catch (qrError) {
          console.error(`❌ Error generando QR:`, qrError);
          // No fallar la aprobación si el QR falla
        }
      } else {
        // Solo nivel 2 aprobado, falta nivel 1
        await pool.query(
          `UPDATE requests SET status = 'level2_approved' WHERE id = ?`,
          [requestId]
        );
        console.log(`✅ Solicitud ${requestId} aprobada por nivel 2, falta nivel 1`);
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

    // Rechazar la solicitud y guardar quién la rechazó
    if (adminLevel === 1) {
      await pool.query(
        `UPDATE requests SET 
          status = 'rejected',
          denial_reason = ?,
          denied_by_level = ?,
          level1_admin_id = ?,
          level1_date = NOW()
        WHERE id = ?`,
        [reason, adminLevel, req.session.userId, requestId]
      );
    } else {
      await pool.query(
        `UPDATE requests SET 
          status = 'rejected',
          denial_reason = ?,
          denied_by_level = ?,
          level2_admin_id = ?,
          level2_date = NOW()
        WHERE id = ?`,
        [reason, adminLevel, req.session.userId, requestId]
      );
    }

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
 * DELETE /api/admin/requests/:id
 * Eliminar solicitud (solo admin nivel 2)
 */
router.delete('/requests/:id', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const pool = db.getPool();

    console.log(`🗑️ Admin nivel 2 (ID: ${req.session.userId}) eliminando solicitud ${requestId}`);

    // Verificar que la solicitud existe
    const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Eliminar QR asociado si existe
    await pool.query('DELETE FROM qr_codes WHERE request_id = ?', [requestId]);

    // Eliminar la solicitud
    await pool.query('DELETE FROM requests WHERE id = ?', [requestId]);

    console.log(`✅ Solicitud ${requestId} eliminada exitosamente`);

    res.json({
      success: true,
      message: 'Solicitud eliminada exitosamente'
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
  
  // Crear carpeta qr-codes si no existe
  const qrDir = path.join(__dirname, '../../public/qr-codes');
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
    console.log('📁 Carpeta qr-codes creada');
  }
  
  const qrData = JSON.stringify({
    requestId: requestId,
    plate: requestData.vehicle_plate,
    studentName: requestData.student_name,
    studentRut: requestData.student_rut,
    generatedAt: new Date().toISOString()
  });

  // Generar imagen QR
  const qrImagePath = path.join(qrDir, `qr-${requestId}.png`);
  console.log(`📝 Generando QR en: ${qrImagePath}`);
  await QRCode.toFile(qrImagePath, qrData);
  console.log(`✅ QR generado exitosamente`);

  // Generar PDF
  const pdfPath = path.join(qrDir, `permit-${requestId}.pdf`);
  console.log(`📝 Generando PDF en: ${pdfPath}`);
  await generatePDF(requestData, qrImagePath, pdfPath);
  console.log(`✅ PDF generado exitosamente`);

  // Calcular fecha de expiración
  const expiryDays = parseInt(process.env.QR_EXPIRY_DAYS) || 30;
  const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

  // Guardar en base de datos con rutas relativas desde la raíz del proyecto
  await pool.query(
    `INSERT INTO qr_codes (request_id, qr_data, qr_image_path, pdf_path, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [requestId, qrData, `public/qr-codes/qr-${requestId}.png`, `public/qr-codes/permit-${requestId}.pdf`, expiresAt]
  );
  
  console.log(`💾 Rutas guardadas en BD: public/qr-codes/qr-${requestId}.png`);
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
