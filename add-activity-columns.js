const db = require('./server/config/database');

async function addColumns() {
  const pool = db.getPool();

  try {
    console.log('Agregando columnas de actividad...');
    await pool.query(`
      ALTER TABLE requests 
      ADD COLUMN activity_type VARCHAR(50) AFTER student_phone,
      ADD COLUMN activity_description VARCHAR(255) AFTER activity_type
    `);
    console.log('✅ Columnas agregadas exitosamente');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Las columnas ya existen');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await db.closePool();
  }
}

addColumns();
