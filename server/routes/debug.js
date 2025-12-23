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
    await fixQRs();
    
    res.json({
      success: true,
      message: 'QRs arreglados exitosamente'
    });
  } catch (error) {
    console.error('Error arreglando QRs:', error);
    res.status(500).json({
      success: false,
      message: 'Error arreglando QRs: ' + error.message
    });
  }
});

module.exports = router;