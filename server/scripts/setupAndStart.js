require('dotenv').config();
const mysql = require('mysql2/promise');
const db = require('../config/database');
const { spawn } = require('child_process');

async function setupAndStart() {
  let connection;
  
  try {
    console.log('🚀 Iniciando configuración automática...\n');
    
    console.log('📦 Verificando base de datos...');
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
    
    console.log(`✓ Base de datos '${dbName}' lista`);
    await connection.end();

    console.log('📋 Verificando tablas...');
    const pool = db.getPool();
    const [tables] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [dbName]);

    if (tables[0].count === 0) {
      console.log('📝 Creando tablas y datos iniciales...');
      await db.initializeDatabase();
      console.log('✓ Base de datos inicializada');
    } else {
      console.log('✓ Tablas ya existen');
    }

    await db.closePool();

    console.log('\n✅ Configuración completada');
    console.log('🚀 Iniciando servidor...\n');

    const server = spawn('node', ['server/server.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    server.on('error', (error) => {
      console.error('✗ Error al iniciar el servidor:', error);
      process.exit(1);
    });

    server.on('exit', (code) => {
      process.exit(code);
    });

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

setupAndStart();
