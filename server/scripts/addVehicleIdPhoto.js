/**
 * Script de migración para agregar el campo vehicle_id_photo_path
 * Ejecutar con: node server/scripts/addVehicleIdPhoto.js
 */

require('dotenv').config();
const db = require('../config/database');

async function addVehicleIdPhotoColumn() {
  try {
    const pool = db.getPool();
    const dbName = process.env.DB_DATABASE || 'mecanicav2';
    
    console.log('🔄 Verificando si la columna vehicle_id_photo_path existe...');
    console.log(`   Base de datos: ${dbName}`);
    
    // Verificar si la columna ya existe
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'requests' 
      AND COLUMN_NAME = 'vehicle_id_photo_path'
    `, [dbName]);
    
    if (columns.length > 0) {
      console.log('✅ La columna vehicle_id_photo_path ya existe');
      console.log('   No se requiere ninguna acción');
      process.exit(0);
    }
    
    console.log('📝 Agregando columna vehicle_id_photo_path a la tabla requests...');
    
    // Agregar la columna
    await pool.query(`
      ALTER TABLE requests 
      ADD COLUMN vehicle_id_photo_path VARCHAR(500) NULL AFTER vehicle_photo_path
    `);
    
    console.log('✅ Columna vehicle_id_photo_path agregada exitosamente');
    console.log('   Tipo: VARCHAR(500)');
    console.log('   Posición: Después de vehicle_photo_path');
    console.log('   Permite NULL: Sí');
    
    // Verificar que se agregó correctamente
    const [verify] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'requests' 
      AND COLUMN_NAME = 'vehicle_id_photo_path'
    `, [dbName]);
    
    if (verify.length > 0) {
      console.log('\n✅ Verificación exitosa:');
      console.log(`   Columna: ${verify[0].COLUMN_NAME}`);
      console.log(`   Tipo: ${verify[0].DATA_TYPE}`);
      console.log(`   Nullable: ${verify[0].IS_NULLABLE}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

addVehicleIdPhotoColumn();
