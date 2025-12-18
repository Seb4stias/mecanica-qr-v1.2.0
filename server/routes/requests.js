const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const Request = require('../models/Request');
const QRCode = require('../models/QRCode');

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (aumentado para 2 fotos)
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
router.post('/', requireAuth, upload.fields([
  { name: 'vehiclePhoto', maxCount: 1 },
  { name: 'vehicleIdPhoto', maxCount: 1 }
]), async (req, res, next) => {
  try {
    console.log('📝 Datos recibidos del formulario:', req.body);
    console.log('📷 Archivos recibidos:', req.files);
    
    const {
      studentName,
      studentRut,
      studentCarrera,
      studentEmail,
      studentPhone,
      activityType,
      activityDescription,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
      garageLocation,
      modificationsDescription
    } = req.body;

    const vehiclePhotoPath = req.files['vehiclePhoto'] ? `/uploads/${req.files['vehiclePhoto'][0].filename}` : null;
    const vehicleIdPhotoPath = req.files['vehicleIdPhoto'] ? `/uploads/${req.files['vehicleIdPhoto'][0].filename}` : null;

    console.log('📊 Datos a insertar:', {
      userId: req.session.userId,
      studentName,
      studentRut,
      studentCarrera,
      studentEmail,
      studentPhone,
      activityType,
      activityDescription,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
      vehiclePhotoPath,
      vehicleIdPhotoPath,
      garageLocation,
      modificationsDescription
    });

    const newRequest = new Request({
      user_id: req.session.userId,
      student_name: studentName,
      student_rut: studentRut,
      student_carrera: studentCarrera,
      student_email: studentEmail,
      student_phone: studentPhone,
      activity_type: activityType,
      activity_description: activityDescription || null,
      vehicle_plate: vehiclePlate,
      vehicle_model: vehicleModel,
      vehicle_color: vehicleColor,
      vehicle_photo_path: vehiclePhotoPath,
      vehicle_id_photo_path: vehicleIdPhotoPath,
      garage_location: garageLocation,
      modifications_description: modificationsDescription,
      status: 'pending'
    });

    const result = await newRequest.save();

    res.json({
      success: true,
      message: 'Solicitud creada exitosamente',
      requestId: result._id
    });
  } catch (error) {
    console.error('❌ Error al crear solicitud:', error);
    if (error.name === 'ValidationError') {
      console.error('❌ Detalles de validación:', error.errors);
    }
    next(error);
  }
});

/**
 * GET /api/requests
 * Obtener solicitudes del usuario actual
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const requests = await Request.find({ user_id: req.session.userId })
      .sort({ created_at: -1 });

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
    const request = await Request.findOne({ 
      _id: req.params.id, 
      user_id: req.session.userId 
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    res.json({
      success: true,
      request
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
    // Verificar que la solicitud existe y está aprobada
    const request = await Request.findOne({ 
      _id: req.params.id,
      $or: [
        { user_id: req.session.userId },
        // Si es admin, puede acceder a cualquier solicitud
        ...(req.session.userRole && ['admin_level1', 'admin_level2'].includes(req.session.userRole) ? [{}] : [])
      ]
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }
    
    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'La solicitud debe estar aprobada para descargar el QR'
      });
    }
    
    // Buscar el QR en la base de datos
    const qrCode = await QRCode.findOne({ request_id: req.params.id });
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR no encontrado'
      });
    }
    console.log('🔍 QR path en BD:', qrCode.qr_image_path);
    console.log('🔍 __dirname:', __dirname);
    const qrPath = path.join(__dirname, '../../', qrCode.qr_image_path);
    console.log('🔍 Path completo:', qrPath);
    
    // Verificar que el archivo existe antes de intentar descargarlo
    if (!fs.existsSync(qrPath)) {
      console.error(`❌ Archivo QR no encontrado: ${qrPath}`);
      return res.status(404).json({
        success: false,
        message: `ENOENT: no such file or directory, stat '${qrPath}'`
      });
    }
    
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
    // Verificar que la solicitud existe y está aprobada
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }
    
    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'La solicitud debe estar aprobada para descargar el formulario'
      });
    }
    
    // Buscar el QR en la base de datos
    const qrCode = await QRCode.findOne({ request_id: req.params.id });
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR no encontrado'
      });
    }
    console.log('🔍 PDF path en BD:', qrCode.pdf_path);
    const pdfPath = path.join(__dirname, '../../', qrCode.pdf_path);
    console.log('🔍 Path completo PDF:', pdfPath);
    
    // Verificar que el archivo existe antes de intentar descargarlo
    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ Archivo PDF no encontrado: ${pdfPath}`);
      return res.status(404).json({
        success: false,
        message: `ENOENT: no such file or directory, stat '${pdfPath}'`
      });
    }
    
    res.download(pdfPath, `Permiso-${request.vehicle_plate}.pdf`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
