/**
 * Script de migración para agregar el campo vehicle_id_photo_path
 * Ejecutar con: node server/scripts/addVehicleIdPhoto.js
 */

require('dotenv').config();
const db = require('../config/database');

async function addVehicleIdPhotoColumn() {
  try {
    const pool = db.getPool();
    
    console.log('🔄 Verificando si la columna vehicle_id_photo_path existe...');
    
    // Verificar si la columna ya existe
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'requests' 
      AND COLUMN_NAME = 'vehicle_id_photo_path'
    `, [process.env.DB_DATABASE || 'mecanicav2']);
    
    if (columns.length > 0) {
      console.log('✅ La columna vehicle_id_photo_path ya existe');
      process.exit(0);
    }
    
    console.log('📝 Agregando columna vehicle_id_photo_path...');
    
    // Agregar la columna
    await pool.query(`
      ALTER TABLE requests 
      ADD COLUMN vehicle_id_photo_path VARCHAR(500) AFTER vehicle_photo_path
    `);
    
    console.log('✅ Columna vehicle_id_photo_path agregada exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addVehicleIdPhotoColumn();
