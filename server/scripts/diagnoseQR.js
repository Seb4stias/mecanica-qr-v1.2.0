/**
 * Script de diagnóstico para problemas con QR
 * Ejecutar con: node server/scripts/diagnoseQR.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function diagnose() {
  console.log('🔍 Iniciando diagnóstico de QR...\n');

  // 1. Verificar directorios
  console.log('📁 Verificando directorios:');
  const qrDir = path.join(__dirname, '../../public/qr-codes');
  const uploadsDir = path.join(__dirname, '../../public/uploads');
  
  console.log(`   QR Directory: ${qrDir}`);
  console.log(`   Exists: ${fs.existsSync(qrDir)}`);
  
  if (!fs.existsSync(qrDir)) {
    console.log('   ⚠️  Creando directorio qr-codes...');
    fs.mkdirSync(qrDir, { recursive: true });
    console.log('   ✅ Directorio creado');
  }
  
  console.log(`\n   Uploads Directory: ${uploadsDir}`);
  console.log(`   Exists: ${fs.existsSync(uploadsDir)}`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('   ⚠️  Creando directorio uploads...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('   ✅ Directorio creado');
  }

  // 2. Verificar permisos
  console.log('\n🔐 Verificando permisos de escritura:');
  try {
    const testFile = path.join(qrDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('   ✅ Permisos de escritura OK');
  } catch (error) {
    console.log('   ❌ Error de permisos:', error.message);
  }

  // 3. Verificar solicitudes aprobadas sin QR
  console.log('\n📋 Verificando solicitudes aprobadas:');
  try {
    const pool = db.getPool();
    const [requests] = await pool.query(`
      SELECT r.id, r.status, r.vehicle_plate, r.level1_approved, r.level2_approved,
             (SELECT COUNT(*) FROM qr_codes WHERE request_id = r.id) as has_qr
      FROM requests r
      WHERE r.status = 'approved'
    `);

    console.log(`   Total solicitudes aprobadas: ${requests.length}`);
    
    const withoutQR = requests.filter(r => r.has_qr === 0);
    console.log(`   Sin QR generado: ${withoutQR.length}`);
    
    if (withoutQR.length > 0) {
      console.log('\n   ⚠️  Solicitudes aprobadas sin QR:');
      withoutQR.forEach(r => {
        console.log(`      - ID: ${r.id}, Patente: ${r.vehicle_plate}, Level1: ${r.level1_approved}, Level2: ${r.level2_approved}`);
      });
      
      console.log('\n   💡 Para regenerar QR, usa:');
      console.log('      POST /api/admin/requests/{id}/regenerate-qr');
    }

    // 4. Verificar archivos QR existentes
    console.log('\n📄 Verificando archivos QR en disco:');
    const [qrCodes] = await pool.query('SELECT * FROM qr_codes');
    console.log(`   Total QR en BD: ${qrCodes.length}`);
    
    qrCodes.forEach(qr => {
      const qrPath = path.join(__dirname, '../../', qr.qr_image_path);
      const pdfPath = path.join(__dirname, '../../', qr.pdf_path);
      
      const qrExists = fs.existsSync(qrPath);
      const pdfExists = fs.existsSync(pdfPath);
      
      console.log(`\n   QR ID ${qr.id} (Request ${qr.request_id}):`);
      console.log(`      QR Image: ${qrExists ? '✅' : '❌'} ${qr.qr_image_path}`);
      console.log(`      PDF: ${pdfExists ? '✅' : '❌'} ${qr.pdf_path}`);
      
      if (!qrExists || !pdfExists) {
        console.log(`      ⚠️  Archivos faltantes - considerar regenerar`);
      }
    });

  } catch (error) {
    console.error('   ❌ Error consultando BD:', error.message);
  }

  console.log('\n✅ Diagnóstico completado\n');
  process.exit(0);
}

diagnose().catch(error => {
  console.error('❌ Error en diagnóstico:', error);
  process.exit(1);
});
