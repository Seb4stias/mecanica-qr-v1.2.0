require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const db = require('./config/database');

const PORT = process.env.PORT || 6777;

/**
 * Crear usuario administrador por defecto
 */
async function createDefaultAdmin() {
  try {
    const pool = db.getPool();
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE role = "admin_level2" LIMIT 1'
    );

    if (existing.length === 0) {
      // Usar variables de entorno o valores por defecto
      const adminName = process.env.ADMIN_NAME || 'Administrador';
      const adminRut = process.env.ADMIN_RUT || '99999999-9';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@inacap.cl';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role, rut, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [adminEmail, passwordHash, adminName, 'admin_level2', adminRut]
      );
      console.log(`✓ Usuario admin creado: ${adminRut} / ${adminEmail}`);
      console.log('⚠️  CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE');
    }
  } catch (error) {
    console.error('⚠️  Error al crear usuario admin:', error.message);
  }
}

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
      
      // Crear usuario admin por defecto
      console.log('👤 Creando usuario administrador...');
      await createDefaultAdmin();
      console.log('✓ Setup completo');
    } else {
      console.log(`✓ Base de datos ya existe con ${tables[0].count} tablas`);
    }

  } catch (error) {
    console.error('⚠️  Error al configurar la base de datos:', error.message);
    if (connection) {
      await connection.end().catch(() => {});
    }
    throw error; // Lanzar el error para que el servidor NO arranque
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

// Configurar base de datos y luego iniciar servidor
console.log('🔄 Iniciando configuración de base de datos...');
setupDatabase()
  .then(() => {
    console.log('✓ Base de datos lista, importando aplicación...');
    // Importar app DESPUÉS de que la base de datos esté lista
    const app = require('./app');
    
    console.log('✓ Aplicación cargada, iniciando servidor...');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Base de datos MariaDB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
    });
  })
  .catch((error) => {
    console.error('✗ Error fatal al iniciar:', error);
    process.exit(1);
  });
