const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Debug: Mostrar variables de entorno
console.log('🔍 Variables de BD:');
console.log('   DB_HOST:', process.env.DB_HOST || 'NO DEFINIDO (usando localhost)');
console.log('   DB_USER:', process.env.DB_USER || 'NO DEFINIDO (usando root)');
console.log('   DB_DATABASE:', process.env.DB_DATABASE || 'NO DEFINIDO (usando mecanica)');
console.log('   DB_PORT:', process.env.DB_PORT || 'NO DEFINIDO (usando 3306)');

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'mecanica',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Inicializa la base de datos ejecutando el schema.sql
 */
async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Dividir el schema en statements individuales
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Ejecutar cada statement
    for (const statement of statements) {
      await pool.query(statement);
    }
    
    console.log('✓ Schema de base de datos ejecutado correctamente');
  } catch (error) {
    console.error('✗ Error al inicializar base de datos:', error.message);
    throw error;
  }
}

/**
 * Obtiene el pool de conexiones
 */
function getPool() {
  return pool;
}

/**
 * Cierra todas las conexiones del pool
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  getPool,
  initializeDatabase,
  closePool
};
