const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Endpoint para debuggear qué está pasando con los archivos
router.get('/check-file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../../public/js', filename);
  
  console.log(`🔍 Checking file: ${filename}`);
  console.log(`🔍 Full path: ${filePath}`);
  console.log(`🔍 File exists: ${fs.existsSync(filePath)}`);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`🔍 File size: ${content.length} bytes`);
    console.log(`🔍 First 100 chars: ${content.substring(0, 100)}`);
    
    res.json({
      exists: true,
      size: content.length,
      firstChars: content.substring(0, 100),
      path: filePath
    });
  } else {
    res.json({
      exists: false,
      path: filePath
    });
  }
});

// Endpoint para servir admin.js directamente
router.get('/admin-js', (req, res) => {
  const filePath = path.join(__dirname, '../../public/js/admin.js');
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
  } else {
    res.status(404).send('admin.js not found');
  }
});

// Endpoint temporal para arreglar QRs
router.get('/fix-qrs', async (req, res) => {
  try {
    const { fixQRs } = require('../scripts/fixQRs');
    
    // Ejecutar el script de arreglo
    const result = await fixQRs();
    
    res.json({
      success: true,
      message: 'QRs arreglados exitosamente',
      result
    });
  } catch (error) {
    console.error('Error arreglando QRs:', error);
    res.status(500).json({
      success: false,
      message: 'Error arreglando QRs: ' + error.message
    });
  }
});

// Endpoint de prueba para el escáner
router.post('/test-scanner', async (req, res) => {
  try {
    console.log('🧪 TEST SCANNER - Datos recibidos:', req.body);
    
    const QRCodeModel = require('../models/QRCode');
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.json({ error: 'No qrData provided' });
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (e) {
      return res.json({ error: 'Invalid JSON', qrData });
    }
    
    // Buscar el QR
    const qr = await QRCodeModel.findOne({
      request_id: parsedData.requestId,
      is_active: true
    });
    
    res.json({
      success: true,
      parsedData,
      qrFound: !!qr,
      qrId: qr ? qr._id : null
    });
    
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Endpoint para ver QRs en la BD
router.get('/check-qrs', async (req, res) => {
  try {
    const QRCodeModel = require('../models/QRCode');
    const Request = require('../models/Request');
    
    const qrs = await QRCodeModel.find({}).limit(10);
    const allRequests = await Request.find({}).limit(10);
    const approvedRequests = await Request.find({ status: 'approved' }).limit(5);
    
    const qrDetails = qrs.map(qr => ({
      id: qr._id,
      request_id: qr.request_id,
      is_active: qr.is_active,
      qr_content: qr.qr_code ? qr.qr_code.substring(0, 100) + '...' : 'null'
    }));
    
    const requestDetails = allRequests.map(r => ({
      id: r._id.toString(),
      status: r.status,
      plate: r.vehicle_plate,
      level1_approved: r.level1_approved,
      level2_approved: r.level2_approved
    }));
    
    res.json({
      success: true,
      qrs_count: qrs.length,
      total_requests: allRequests.length,
      approved_requests: approvedRequests.length,
      qr_details: qrDetails,
      request_details: requestDetails,
      sample_approved_ids: approvedRequests.map(r => r._id.toString())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;