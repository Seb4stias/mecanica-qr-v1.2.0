/**
 * Script para arreglar las rutas de las imágenes en la base de datos
 * Ejecutar con: node server/scripts/fixImagePaths.js
 */

require('dotenv').config();
const db = require('../config/database');

async function fixImagePaths() {
  try {
    const pool = db.getPool();
    
    console.log('🔄 Arreglando rutas de imágenes...');
    
    // Obtener todas las solicitudes con fotos
    const [requests] = await pool.query(`
      SELECT id, vehicle_photo_path, vehicle_id_photo_path 
      FROM requests 
      WHERE vehicle_photo_path IS NOT NULL OR vehicle_id_photo_path IS NOT NULL
    `);
    
    console.log(`📋 Encontradas ${requests.length} solicitudes con fotos`);
    
    let fixed = 0;
    
    for (const req of requests) {
      let needsUpdate = false;
      let newPhotoPath = req.vehicle_photo_path;
      let newIdPhotoPath = req.vehicle_id_photo_path;
      
      // Arreglar vehicle_photo_path
      if (req.vehicle_photo_path) {
        // Quitar barra inicial si existe
        let cleaned = req.vehicle_photo_path.replace(/^\/+/, '');
        // Asegurar que empiece con uploads/
        if (!cleaned.startsWith('uploads/')) {
          cleaned = 'uploads/' + cleaned.replace(/^.*uploads\//, '');
        }
        newPhotoPath = cleaned;
        
        if (newPhotoPath !== req.vehicle_photo_path) {
          needsUpdate = true;
          console.log(`  📝 ID ${req.id}: "${req.vehicle_photo_path}" → "${newPhotoPath}"`);
        }
      }
      
      // Arreglar vehicle_id_photo_path
      if (req.vehicle_id_photo_path) {
        let cleaned = req.vehicle_id_photo_path.replace(/^\/+/, '');
        if (!cleaned.startsWith('uploads/')) {
          cleaned = 'uploads/' + cleaned.replace(/^.*uploads\//, '');
        }
        newIdPhotoPath = cleaned;
        
        if (newIdPhotoPath !== req.vehicle_id_photo_path) {
          needsUpdate = true;
          console.log(`  📝 ID ${req.id}: "${req.vehicle_id_photo_path}" → "${newIdPhotoPath}"`);
        }
      }
      
      // Actualizar si es necesario
      if (needsUpdate) {
        await pool.query(
          'UPDATE requests SET vehicle_photo_path = ?, vehicle_id_photo_path = ? WHERE id = ?',
          [newPhotoPath, newIdPhotoPath, req.id]
        );
        fixed++;
      }
    }
    
    console.log(`\n✅ Arregladas ${fixed} solicitudes`);
    console.log('✅ Todas las rutas ahora están en formato: uploads/vehicle-xxxxx.jpg');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

fixImagePaths();
