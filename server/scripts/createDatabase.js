require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDatabase() {
  let connection;
  
  try {
    console.log('🔄 Conectando al servidor MariaDB...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    console.log('✓ Conectado al servidor MariaDB');

    const dbName = process.env.DB_DATABASE || 'mecanica';
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci`);
    
    console.log(`✓ Base de datos '${dbName}' creada o ya existe`);
    console.log('\n📋 Ahora puedes ejecutar: npm run init-db\n');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createDatabase();
