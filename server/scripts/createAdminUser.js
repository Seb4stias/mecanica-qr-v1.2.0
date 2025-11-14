require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'mecanica',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    console.log('✓ Conectado a la base de datos');

    // Verificar si ya existe un admin
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE role = "admin_level2" LIMIT 1'
    );

    if (existing.length > 0) {
      console.log('⚠️  Ya existe un usuario administrador');
      return;
    }

    // Crear usuario admin por defecto
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await connection.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      ['admin@inacap.cl', passwordHash, 'Administrador', 'admin_level2']
    );

    console.log('✓ Usuario administrador creado exitosamente');
    console.log('  Email: admin@inacap.cl');
    console.log('  Password: admin123');
    console.log('  ⚠️  CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE');

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdminUser();
