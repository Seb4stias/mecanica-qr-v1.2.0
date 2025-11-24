const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const db = require('../config/database');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { logAudit } = require('../utils/auditLogger');

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

      // Registrar en auditoría
      await logAudit('request_approved_level1', `Solicitud aprobada por nivel 1 para ${request.student_name}`, req.session.userId, null, requestId, { comments });

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
          console.log(`✅ QR y PDF generados para solicitud ${requestId}`);
        } catch (qrError) {
          console.error(`❌ Error generando QR:`, qrError);
          console.error(`❌ Stack:`, qrError.stack);
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

      // Registrar en auditoría
      await logAudit('request_approved_level2', `Solicitud aprobada por nivel 2 para ${request.student_name}`, req.session.userId, null, requestId, { comments });

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
          console.log(`✅ QR y PDF generados para solicitud ${requestId}`);
        } catch (qrError) {
          console.error(`❌ Error generando QR:`, qrError);
          console.error(`❌ Stack:`, qrError.stack);
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

    const request = requests[0];

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

    // Registrar en auditoría
    await logAudit('request_rejected', `Solicitud rechazada por nivel ${adminLevel} para ${request.student_name}. Razón: ${reason}`, req.session.userId, null, requestId, { reason, adminLevel });

    res.json({
      success: true,
      message: 'Solicitud rechazada'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/requests/:id/regenerate-qr
 * Regenerar QR y PDF para una solicitud aprobada
 */
router.post('/requests/:id/regenerate-qr', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const pool = db.getPool();

    console.log(`🔄 Regenerando QR para solicitud ${requestId}`);

    // Verificar que la solicitud existe y está aprobada
    const [requests] = await pool.query('SELECT * FROM requests WHERE id = ?', [requestId]);
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    const request = requests[0];

    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden regenerar QR de solicitudes aprobadas'
      });
    }

    // Eliminar QR anterior si existe
    await pool.query('DELETE FROM qr_codes WHERE request_id = ?', [requestId]);

    // Generar nuevo QR
    try {
      await generateQRCode(requestId, request);
      console.log(`✅ QR y PDF regenerados para solicitud ${requestId}`);

      res.json({
        success: true,
        message: 'QR y PDF regenerados exitosamente'
      });
    } catch (qrError) {
      console.error(`❌ Error regenerando QR:`, qrError);
      res.status(500).json({
        success: false,
        message: 'Error al regenerar QR: ' + qrError.message
      });
    }
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
  
  // Crear carpeta qr-codes si no existe (ruta absoluta)
  const qrDir = path.join(__dirname, '../../public/qr-codes');
  console.log(`📁 Verificando directorio QR: ${qrDir}`);
  
  if (!fs.existsSync(qrDir)) {
    console.log(`📁 Creando directorio: ${qrDir}`);
    fs.mkdirSync(qrDir, { recursive: true });
    console.log('✅ Carpeta qr-codes creada');
  } else {
    console.log('✅ Directorio qr-codes ya existe');
  }
  
  const qrData = JSON.stringify({
    requestId: requestId,
    plate: requestData.vehicle_plate,
    studentName: requestData.student_name,
    studentRut: requestData.student_rut,
    generatedAt: new Date().toISOString()
  });

  // Generar imagen QR (ruta absoluta)
  const qrImagePath = path.join(qrDir, `qr-${requestId}.png`);
  console.log(`📝 Generando QR en: ${qrImagePath}`);
  
  try {
    await QRCode.toFile(qrImagePath, qrData);
    console.log(`✅ QR generado exitosamente`);
    
    // Verificar que el archivo existe
    if (fs.existsSync(qrImagePath)) {
      console.log(`✅ Archivo QR verificado: ${qrImagePath}`);
    } else {
      throw new Error(`Archivo QR no encontrado después de generación: ${qrImagePath}`);
    }
  } catch (error) {
    console.error(`❌ Error generando QR:`, error);
    throw error;
  }

  // Generar PDF (ruta absoluta)
  const pdfPath = path.join(qrDir, `permit-${requestId}.pdf`);
  console.log(`📝 Generando PDF en: ${pdfPath}`);
  
  try {
    await generatePDF(requestData, qrImagePath, pdfPath);
    console.log(`✅ PDF generado exitosamente`);
    
    // Verificar que el archivo existe
    if (fs.existsSync(pdfPath)) {
      console.log(`✅ Archivo PDF verificado: ${pdfPath}`);
    } else {
      throw new Error(`Archivo PDF no encontrado después de generación: ${pdfPath}`);
    }
  } catch (error) {
    console.error(`❌ Error generando PDF:`, error);
    throw error;
  }

  // Calcular fecha de expiración
  const expiryDays = parseInt(process.env.QR_EXPIRY_DAYS) || 30;
  const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

  // Guardar en base de datos con rutas relativas desde la raíz del proyecto
  const relativeQrPath = `public/qr-codes/qr-${requestId}.png`;
  const relativePdfPath = `public/qr-codes/permit-${requestId}.pdf`;
  
  await pool.query(
    `INSERT INTO qr_codes (request_id, qr_data, qr_image_path, pdf_path, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [requestId, qrData, relativeQrPath, relativePdfPath, expiresAt]
  );
  
  console.log(`💾 Rutas guardadas en BD: ${relativeQrPath}, ${relativePdfPath}`);
}

/**
 * Función auxiliar para generar PDF
 */
async function generatePDF(requestData, qrImagePath, pdfPath) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Iniciando generación de PDF...');
      console.log('   QR Image Path:', qrImagePath);
      console.log('   PDF Path:', pdfPath);
      
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(pdfPath);

      doc.pipe(stream);

    // Título
    doc.fontSize(24).font('Helvetica-Bold').text('PERMISO DE ACCESO VEHICULAR', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('INACAP - Perhosting', { align: 'center' });
    doc.moveDown(2);

    // Información del Estudiante
    doc.fontSize(16).font('Helvetica-Bold').text('DATOS DEL ESTUDIANTE');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Nombre: ${requestData.student_name}`);
    doc.text(`RUT: ${requestData.student_rut}`);
    doc.text(`Carrera: ${requestData.student_carrera || 'No especificada'}`);
    doc.text(`Email: ${requestData.student_email}`);
    doc.text(`Teléfono: ${requestData.student_phone || 'No especificado'}`);
    doc.moveDown(1.5);

    // Información del Vehículo
    doc.fontSize(16).font('Helvetica-Bold').text('DATOS DEL VEHÍCULO');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Patente: ${requestData.vehicle_plate}`);
    doc.text(`Modelo: ${requestData.vehicle_model}`);
    doc.text(`Color: ${requestData.vehicle_color}`);
    doc.text(`Ubicación Garaje: ${requestData.garage_location || 'No especificada'}`);
    doc.moveDown(1);

    // Modificaciones
    if (requestData.modifications_description) {
      doc.fontSize(16).font('Helvetica-Bold').text('MODIFICACIONES DEL VEHÍCULO');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(requestData.modifications_description, { width: 500 });
      doc.moveDown(1);
    }

    // Fotos del vehículo si existen
    if (requestData.vehicle_photo_path || requestData.vehicle_id_photo_path) {
      doc.fontSize(16).font('Helvetica-Bold').text('FOTOS DEL VEHÍCULO');
      doc.moveDown(0.5);
      
      // Foto principal del vehículo
      if (requestData.vehicle_photo_path) {
        try {
          const photoPath = path.join(__dirname, '../../', requestData.vehicle_photo_path);
          if (fs.existsSync(photoPath)) {
            doc.fontSize(12).font('Helvetica').text('Foto del Vehículo:');
            doc.moveDown(0.3);
            doc.image(photoPath, { width: 250, align: 'center' });
            doc.moveDown(0.8);
          }
        } catch (error) {
          console.error('Error agregando foto del vehículo al PDF:', error);
        }
      }
      
      // Foto del número identificador
      if (requestData.vehicle_id_photo_path) {
        try {
          const idPhotoPath = path.join(__dirname, '../../', requestData.vehicle_id_photo_path);
          if (fs.existsSync(idPhotoPath)) {
            doc.fontSize(12).font('Helvetica').text('Foto V2 (Número Identificador):');
            doc.moveDown(0.3);
            doc.image(idPhotoPath, { width: 250, align: 'center' });
            doc.moveDown(1);
          }
        } catch (error) {
          console.error('Error agregando foto V2 al PDF:', error);
        }
      }
    }

    // Código QR
    doc.fontSize(16).font('Helvetica-Bold').text('CÓDIGO QR DE ACCESO', { align: 'center' });
    doc.moveDown(0.5);
    doc.image(qrImagePath, { width: 200, align: 'center' });
    doc.moveDown(1);

    // Fecha de emisión
    doc.fontSize(10).font('Helvetica').text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CL')}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log('✅ PDF escrito exitosamente');
        resolve();
      });
      stream.on('error', (err) => {
        console.error('❌ Error escribiendo PDF:', err);
        reject(err);
      });
    } catch (error) {
      console.error('❌ Error en generatePDF:', error);
      reject(error);
    }
  });
}

/**
 * POST /api/admin/create-request
 * Crear una nueva solicitud como administrador
 */
router.post('/create-request', requireRole('admin_level1', 'admin_level2'), async (req, res, next) => {
  const pool = db.getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      studentName,
      studentRut,
      studentCarrera,
      studentEmail,
      studentPhone,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
      garageLocation,
      modificationsDescription
    } = req.body;
    
    // Validar que el estudiante no tenga ya una solicitud activa
    const [existingRequests] = await connection.query(
      'SELECT id FROM requests WHERE student_rut = ? AND status IN ("pending", "level1_approved", "level2_approved", "approved")',
      [studentRut]
    );
    
    if (existingRequests.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'El estudiante ya tiene una solicitud activa'
      });
    }
    
    // Procesar las fotos
    let vehiclePhotoPath = null;
    let vehicleIdPhotoPath = null;
    
    if (req.files && req.files.vehiclePhoto) {
      const vehiclePhoto = req.files.vehiclePhoto;
      const uploadDir = path.join(__dirname, '../../public/uploads');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const photoFileName = `vehicle_${timestamp}_${vehiclePhoto.name}`;
      vehiclePhotoPath = `/uploads/${photoFileName}`;
      
      await vehiclePhoto.mv(path.join(uploadDir, photoFileName));
    }
    
    if (req.files && req.files.vehicleIdPhoto) {
      const vehicleIdPhoto = req.files.vehicleIdPhoto;
      const uploadDir = path.join(__dirname, '../../public/uploads');
      
      const timestamp = Date.now();
      const idPhotoFileName = `vehicle_id_${timestamp}_${vehicleIdPhoto.name}`;
      vehicleIdPhotoPath = `/uploads/${idPhotoFileName}`;
      
      await vehicleIdPhoto.mv(path.join(uploadDir, idPhotoFileName));
    }
    
    // Insertar la solicitud con el user_id del admin que la crea
    const [result] = await connection.query(
      `INSERT INTO requests (
        user_id,
        student_name,
        student_rut,
        student_carrera,
        student_email,
        student_phone,
        vehicle_plate,
        vehicle_model,
        vehicle_color,
        garage_location,
        vehicle_photo_path,
        vehicle_id_photo_path,
        modifications_description,
        status,
        created_by_admin,
        created_by_admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?)`,
      [
        req.user.id, // El admin que crea la solicitud
        studentName,
        studentRut,
        studentCarrera,
        studentEmail,
        studentPhone,
        vehiclePlate,
        vehicleModel,
        vehicleColor,
        garageLocation || null,
        vehiclePhotoPath,
        vehicleIdPhotoPath,
        modificationsDescription || null,
        req.user.id
      ]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Solicitud creada exitosamente',
      requestId: result.insertId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear solicitud:', error);
    next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
