const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');

// Configuración de multer para subir fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'vehicle-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png)'));
  }
});

/**
 * POST /api/requests
 * Crear nueva solicitud de permiso
 */
router.post('/', requireAuth, upload.single('vehiclePhoto'), async (req, res, next) => {
  try {
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

    const vehiclePhotoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const pool = db.getPool();
    const [result] = await pool.query(
      `INSERT INTO requests (
        user_id, student_name, student_rut, student_carrera, student_email,
        student_phone, vehicle_plate, vehicle_model, vehicle_color,
        vehicle_photo_path, garage_location, modifications_description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.session.userId,
        studentName,
        studentRut,
        studentCarrera,
        studentEmail,
        studentPhone,
        vehiclePlate,
        vehicleModel,
        vehicleColor,
        vehiclePhotoPath,
        garageLocation,
        modificationsDescription
      ]
    );

    res.json({
      success: true,
      message: 'Solicitud creada exitosamente',
      requestId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requests
 * Obtener solicitudes del usuario actual
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const pool = db.getPool();
    const [requests] = await pool.query(
      'SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.userId]
    );

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requests/:id
 * Obtener detalle de una solicitud
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const pool = db.getPool();
    const [requests] = await pool.query(
      'SELECT * FROM requests WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

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
 * GET /api/requests/:id/qr
 * Descargar imagen QR de una solicitud aprobada
 */
router.get('/:id/qr', requireAuth, async (req, res, next) => {
  try {
    const pool = db.getPool();
    
    // Verificar que la solicitud existe y está aprobada
    const [requests] = await pool.query(
      'SELECT * FROM requests WHERE id = ? AND (user_id = ? OR ? IN (SELECT role FROM users WHERE id = ? AND role IN ("admin_level1", "admin_level2")))',
      [req.params.id, req.session.userId, req.session.userRole, req.session.userId]
    );
    
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
        message: 'La solicitud debe estar aprobada para descargar el QR'
      });
    }
    
    // Buscar el QR en la base de datos
    const [qrCodes] = await pool.query(
      'SELECT * FROM qr_codes WHERE request_id = ?',
      [req.params.id]
    );
    
    if (qrCodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'QR no encontrado'
      });
    }
    
    const qrCode = qrCodes[0];
    const qrPath = path.join(__dirname, '../../', qrCode.qr_image_path);
    
    res.download(qrPath, `QR-${request.vehicle_plate}.png`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requests/:id/pdf
 * Descargar PDF del formulario con QR
 */
router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const pool = db.getPool();
    
    // Verificar que la solicitud existe y está aprobada
    const [requests] = await pool.query(
      'SELECT * FROM requests WHERE id = ?',
      [req.params.id]
    );
    
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
        message: 'La solicitud debe estar aprobada para descargar el formulario'
      });
    }
    
    // Buscar el QR en la base de datos
    const [qrCodes] = await pool.query(
      'SELECT * FROM qr_codes WHERE request_id = ?',
      [req.params.id]
    );
    
    if (qrCodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'QR no encontrado'
      });
    }
    
    const qrCode = qrCodes[0];
    const pdfPath = path.join(__dirname, '../../', qrCode.pdf_path);
    
    res.download(pdfPath, `Permiso-${request.vehicle_plate}.pdf`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
