require('dotenv').config();
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const User = require('../models/User');
const Request = require('../models/Request');
const QRCode = require('../models/QRCode');
const AuditLog = require('../models/AuditLog');

/**
 * Script para migrar datos de MySQL a MongoDB
 * 
 * IMPORTANTE: Este script requiere que tengas mysql2 instalado
 * npm install mysql2
 * 
 * Y que configures las variables de entorno de MySQL:
 * DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE
 */

async function migrateFromMySQL() {
  let mysqlConnection = null;
  
  try {
    console.log('🚀 Iniciando migración de MySQL a MongoDB...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // Conectar a MySQL
    mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'mecanicav2',
      port: parseInt(process.env.DB_PORT) || 3306
    });
    console.log('✓ Conectado a MySQL');

    // Mapeo de IDs de MySQL a MongoDB
    const userIdMap = new Map();
    const requestIdMap = new Map();

    // 1. Migrar usuarios
    console.log('\n👥 Migrando usuarios...');
    const [mysqlUsers] = await mysqlConnection.query('SELECT * FROM users');
    
    for (const mysqlUser of mysqlUsers) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email: mysqlUser.email });
        
        if (existingUser) {
          console.log(`   ⚠️  Usuario ya existe: ${mysqlUser.email}`);
          userIdMap.set(mysqlUser.id, existingUser._id);
          continue;
        }

        const newUser = new User({
          email: mysqlUser.email,
          password_hash: mysqlUser.password_hash,
          name: mysqlUser.name,
          role: mysqlUser.role,
          rut: mysqlUser.rut,
          carrera: mysqlUser.carrera,
          phone: mysqlUser.phone,
          is_active: mysqlUser.is_active,
          created_at: mysqlUser.created_at,
          updated_at: mysqlUser.updated_at
        });

        await newUser.save();
        userIdMap.set(mysqlUser.id, newUser._id);
        console.log(`   ✓ Usuario migrado: ${mysqlUser.email}`);
      } catch (error) {
        console.error(`   ❌ Error migrando usuario ${mysqlUser.email}:`, error.message);
      }
    }

    console.log(`   📊 Total usuarios migrados: ${userIdMap.size}`);

    // 2. Migrar solicitudes
    console.log('\n📝 Migrando solicitudes...');
    const [mysqlRequests] = await mysqlConnection.query('SELECT * FROM requests');
    
    for (const mysqlRequest of mysqlRequests) {
      try {
        const mongoUserId = userIdMap.get(mysqlRequest.user_id);
        
        if (!mongoUserId) {
          console.log(`   ⚠️  Usuario no encontrado para solicitud ${mysqlRequest.id}`);
          continue;
        }

        const newRequest = new Request({
          user_id: mongoUserId,
          student_name: mysqlRequest.student_name,
          student_rut: mysqlRequest.student_rut,
          student_carrera: mysqlRequest.student_carrera,
          student_email: mysqlRequest.student_email,
          student_phone: mysqlRequest.student_phone,
          activity_type: mysqlRequest.activity_type,
          activity_description: mysqlRequest.activity_description,
          vehicle_plate: mysqlRequest.vehicle_plate,
          vehicle_model: mysqlRequest.vehicle_model,
          vehicle_color: mysqlRequest.vehicle_color,
          vehicle_photo_path: mysqlRequest.vehicle_photo_path,
          vehicle_id_photo_path: mysqlRequest.vehicle_id_photo_path,
          garage_location: mysqlRequest.garage_location,
          modifications_description: mysqlRequest.modifications_description,
          status: mysqlRequest.status,
          admin_comments: mysqlRequest.admin_comments,
          approved_by: mysqlRequest.approved_by ? userIdMap.get(mysqlRequest.approved_by) : null,
          approved_at: mysqlRequest.approved_at,
          created_at: mysqlRequest.created_at,
          updated_at: mysqlRequest.updated_at
        });

        await newRequest.save();
        requestIdMap.set(mysqlRequest.id, newRequest._id);
        console.log(`   ✓ Solicitud migrada: ${mysqlRequest.vehicle_plate}`);
      } catch (error) {
        console.error(`   ❌ Error migrando solicitud ${mysqlRequest.id}:`, error.message);
      }
    }

    console.log(`   📊 Total solicitudes migradas: ${requestIdMap.size}`);

    // 3. Migrar códigos QR
    console.log('\n📱 Migrando códigos QR...');
    const [mysqlQRs] = await mysqlConnection.query('SELECT * FROM qr_codes');
    
    let qrMigrated = 0;
    for (const mysqlQR of mysqlQRs) {
      try {
        const mongoRequestId = requestIdMap.get(mysqlQR.request_id);
        
        if (!mongoRequestId) {
          console.log(`   ⚠️  Solicitud no encontrada para QR ${mysqlQR.id}`);
          continue;
        }

        // Verificar si el QR ya existe
        const existingQR = await QRCode.findOne({ request_id: mongoRequestId });
        
        if (existingQR) {
          console.log(`   ⚠️  QR ya existe para solicitud ${mysqlQR.request_id}`);
          continue;
        }

        const newQR = new QRCode({
          request_id: mongoRequestId,
          qr_code: mysqlQR.qr_code,
          qr_image_path: mysqlQR.qr_image_path,
          pdf_path: mysqlQR.pdf_path,
          created_at: mysqlQR.created_at
        });

        await newQR.save();
        qrMigrated++;
        console.log(`   ✓ QR migrado: ${mysqlQR.qr_code}`);
      } catch (error) {
        console.error(`   ❌ Error migrando QR ${mysqlQR.id}:`, error.message);
      }
    }

    console.log(`   📊 Total QRs migrados: ${qrMigrated}`);

    // 4. Migrar logs de auditoría
    console.log('\n📋 Migrando logs de auditoría...');
    const [mysqlLogs] = await mysqlConnection.query('SELECT * FROM audit_log');
    
    let logsMigrated = 0;
    for (const mysqlLog of mysqlLogs) {
      try {
        const mongoPerformedBy = userIdMap.get(mysqlLog.performed_by);
        
        if (!mongoPerformedBy) {
          console.log(`   ⚠️  Usuario no encontrado para log ${mysqlLog.id}`);
          continue;
        }

        const newLog = new AuditLog({
          action_type: mysqlLog.action_type,
          performed_by: mongoPerformedBy,
          target_user_id: mysqlLog.target_user_id ? userIdMap.get(mysqlLog.target_user_id) : null,
          target_request_id: mysqlLog.target_request_id ? requestIdMap.get(mysqlLog.target_request_id) : null,
          description: mysqlLog.description,
          ip_address: mysqlLog.ip_address,
          user_agent: mysqlLog.user_agent,
          created_at: mysqlLog.created_at
        });

        await newLog.save();
        logsMigrated++;
        
        if (logsMigrated % 100 === 0) {
          console.log(`   📊 Logs migrados: ${logsMigrated}...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrando log ${mysqlLog.id}:`, error.message);
      }
    }

    console.log(`   📊 Total logs migrados: ${logsMigrated}`);

    // Resumen final
    console.log('\n✅ MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════');
    console.log(`   👥 Usuarios:    ${userIdMap.size}`);
    console.log(`   📝 Solicitudes: ${requestIdMap.size}`);
    console.log(`   📱 QRs:         ${qrMigrated}`);
    console.log(`   📋 Logs:        ${logsMigrated}`);
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('🔌 Conexión MySQL cerrada');
    }
    await mongoose.connection.close();
    console.log('🔌 Conexión MongoDB cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateFromMySQL();
}

module.exports = { migrateFromMySQL };