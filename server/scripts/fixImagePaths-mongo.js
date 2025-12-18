require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Request = require('../models/Request');
const QRCode = require('../models/QRCode');

async function fixImagePaths() {
  try {
    console.log('🔧 Iniciando reparación de rutas de imágenes...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    let fixedRequests = 0;
    let fixedQRs = 0;

    // 1. Arreglar rutas de fotos de vehículos en solicitudes
    console.log('\n🚗 Verificando fotos de vehículos...');
    
    const requests = await Request.find({
      $or: [
        { vehicle_photo_path: { $ne: null } },
        { vehicle_id_photo_path: { $ne: null } }
      ]
    });

    for (const request of requests) {
      let needsUpdate = false;
      const updates = {};

      // Verificar foto del vehículo
      if (request.vehicle_photo_path) {
        const currentPath = request.vehicle_photo_path;
        const fullPath = path.join(__dirname, '../../public', currentPath);
        
        if (!fs.existsSync(fullPath)) {
          // Intentar encontrar el archivo con diferentes extensiones
          const baseName = path.basename(currentPath, path.extname(currentPath));
          const dir = path.dirname(fullPath);
          const extensions = ['.jpg', '.jpeg', '.png'];
          
          let foundPath = null;
          for (const ext of extensions) {
            const testPath = path.join(dir, baseName + ext);
            if (fs.existsSync(testPath)) {
              foundPath = `/uploads/${baseName}${ext}`;
              break;
            }
          }

          if (foundPath) {
            updates.vehicle_photo_path = foundPath;
            needsUpdate = true;
            console.log(`   ✓ Corregida foto vehículo: ${currentPath} → ${foundPath}`);
          } else {
            console.log(`   ❌ No se encontró foto vehículo: ${currentPath}`);
          }
        }
      }

      // Verificar foto del documento del vehículo
      if (request.vehicle_id_photo_path) {
        const currentPath = request.vehicle_id_photo_path;
        const fullPath = path.join(__dirname, '../../public', currentPath);
        
        if (!fs.existsSync(fullPath)) {
          // Intentar encontrar el archivo con diferentes extensiones
          const baseName = path.basename(currentPath, path.extname(currentPath));
          const dir = path.dirname(fullPath);
          const extensions = ['.jpg', '.jpeg', '.png'];
          
          let foundPath = null;
          for (const ext of extensions) {
            const testPath = path.join(dir, baseName + ext);
            if (fs.existsSync(testPath)) {
              foundPath = `/uploads/${baseName}${ext}`;
              break;
            }
          }

          if (foundPath) {
            updates.vehicle_id_photo_path = foundPath;
            needsUpdate = true;
            console.log(`   ✓ Corregida foto documento: ${currentPath} → ${foundPath}`);
          } else {
            console.log(`   ❌ No se encontró foto documento: ${currentPath}`);
          }
        }
      }

      // Actualizar si hay cambios
      if (needsUpdate) {
        await Request.findByIdAndUpdate(request._id, updates);
        fixedRequests++;
      }
    }

    // 2. Arreglar rutas de QRs y PDFs
    console.log('\n📱 Verificando archivos QR y PDF...');
    
    const qrCodes = await QRCode.find({});

    for (const qr of qrCodes) {
      let needsUpdate = false;
      const updates = {};

      // Verificar imagen QR
      if (qr.qr_image_path) {
        const fullPath = path.join(__dirname, '../../', qr.qr_image_path);
        
        if (!fs.existsSync(fullPath)) {
          // Intentar encontrar en diferentes ubicaciones
          const fileName = path.basename(qr.qr_image_path);
          const possiblePaths = [
            `public/qr-codes/${fileName}`,
            `qr-codes/${fileName}`,
            `public/uploads/${fileName}`
          ];

          let foundPath = null;
          for (const testPath of possiblePaths) {
            const fullTestPath = path.join(__dirname, '../../', testPath);
            if (fs.existsSync(fullTestPath)) {
              foundPath = testPath;
              break;
            }
          }

          if (foundPath) {
            updates.qr_image_path = foundPath;
            needsUpdate = true;
            console.log(`   ✓ Corregida ruta QR: ${qr.qr_image_path} → ${foundPath}`);
          } else {
            console.log(`   ❌ No se encontró QR: ${qr.qr_image_path}`);
          }
        }
      }

      // Verificar PDF
      if (qr.pdf_path) {
        const fullPath = path.join(__dirname, '../../', qr.pdf_path);
        
        if (!fs.existsSync(fullPath)) {
          // Intentar encontrar en diferentes ubicaciones
          const fileName = path.basename(qr.pdf_path);
          const possiblePaths = [
            `public/pdfs/${fileName}`,
            `pdfs/${fileName}`,
            `public/uploads/${fileName}`
          ];

          let foundPath = null;
          for (const testPath of possiblePaths) {
            const fullTestPath = path.join(__dirname, '../../', testPath);
            if (fs.existsSync(fullTestPath)) {
              foundPath = testPath;
              break;
            }
          }

          if (foundPath) {
            updates.pdf_path = foundPath;
            needsUpdate = true;
            console.log(`   ✓ Corregida ruta PDF: ${qr.pdf_path} → ${foundPath}`);
          } else {
            console.log(`   ❌ No se encontró PDF: ${qr.pdf_path}`);
          }
        }
      }

      // Actualizar si hay cambios
      if (needsUpdate) {
        await QRCode.findByIdAndUpdate(qr._id, updates);
        fixedQRs++;
      }
    }

    console.log(`\n📊 RESUMEN DE REPARACIONES:`);
    console.log(`   • Solicitudes corregidas: ${fixedRequests}`);
    console.log(`   • QRs corregidos: ${fixedQRs}`);
    console.log('\n✅ Reparación completada');

  } catch (error) {
    console.error('❌ Error en reparación:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixImagePaths();
}

module.exports = { fixImagePaths };