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

module.exports = router;
