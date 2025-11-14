require('dotenv').config();
const mysql = require('mysql2/promise');
const db = require('../config/database');

async function initializeCompleteDatabase() {
  let connection;
  
  try {
    console.log('🔄 Iniciando configuración de base de datos...\n');
    
    console.log('📦 Paso 1: Verificando/Creando base de datos...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    const dbName = process.env.DB_DATABASE || 'mecanica';
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci`);
    
    console.log(`✓ Base de datos '${dbName}' lista\n`);
    await connection.end();

    console.log('📋 Paso 2: Creando tablas y datos iniciales...');
    await db.initializeDatabase();
    
    console.log('\n✅ ¡Base de datos completamente inicializada!');
    console.log('\n📝 Credenciales del administrador:');
    console.log('   Email: admin@inacapmail.cl');
    console.log('   RUT: 11111111-1');
    console.log('   Password: Admin123!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

initializeCompleteDatabase();
