require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Request = require('../models/Request');

async function cleanMissingImages() {
  try {
    console.log('🧹 Iniciando limpieza de imágenes faltantes...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // Obtener todas las solicitudes
    const requests = await Request.find({});
    console.log(`📊 Total de solicitudes: ${requests.length}`);

    let updatedCount = 0;
    let missingImages = 0;

    for (const req of requests) {
      let needsUpdate = false;
      const updates = {};

      // Verificar foto del vehículo
      if (req.vehicle_photo_path) {
        const fullPath = path.join(__dirname, '../../', req.vehicle_photo_path);
        if (!fs.existsSync(fullPath)) {
          console.log(`❌ Imagen faltante: ${req.vehicle_photo_path}`);
          updates.vehicle_photo_path = null;
          needsUpdate = true;
          missingImages++;
        }
      }

      // Verificar foto del documento
      if (req.vehicle_id_photo_path) {
        const fullPath = path.join(__dirname, '../../', req.vehicle_id_photo_path);
        if (!fs.existsSync(fullPath)) {
          console.log(`❌ Imagen faltante: ${req.vehicle_id_photo_path}`);
          updates.vehicle_id_photo_path = null;
          needsUpdate = true;
          missingImages++;
        }
      }

      // Actualizar si es necesario
      if (needsUpdate) {
        await Request.findByIdAndUpdate(req._id, updates);
        updatedCount++;
        console.log(`✓ Actualizada solicitud ${req._id} (${req.vehicle_plate})`);
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   • Solicitudes revisadas: ${requests.length}`);
    console.log(`   • Imágenes faltantes: ${missingImages}`);
    console.log(`   • Solicitudes actualizadas: ${updatedCount}`);
    console.log('\n✅ Limpieza completada');

  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanMissingImages();
}

module.exports = { cleanMissingImages };
