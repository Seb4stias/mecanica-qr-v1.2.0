require('dotenv').config();
const mysql = require('mysql2/promise');
const app = require('./app');
const db = require('./config/database');

const PORT = process.env.PORT || 6777;

/**
 * Configuración automática de la base de datos al iniciar
 */
async function setupDatabase() {
  let connection;
  try {
    // Conectar al servidor MariaDB sin especificar la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    const dbName = process.env.DB_DATABASE || 'mecanica';
    
    // Crear la base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci`);
    
    await connection.end();

    // Verificar si las tablas existen
    const pool = db.getPool();
    const [tables] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [dbName]);

    // Si no hay tablas, inicializar la base de datos
    if (tables[0].count === 0) {
      console.log('📋 Inicializando base de datos por primera vez...');
      await db.initializeDatabase();
      console.log('✓ Base de datos inicializada correctamente');
    }

  } catch (error) {
    console.error('⚠️  Error al configurar la base de datos:', error.message);
    console.error('   El servidor continuará, pero puede haber problemas de conexión.');
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

// Configurar base de datos y luego iniciar servidor
setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Base de datos MariaDB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
  });
}).catch((error) => {
  console.error('✗ Error fatal al iniciar:', error);
  process.exit(1);
});
