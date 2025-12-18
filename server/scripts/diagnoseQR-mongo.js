require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Request = require('../models/Request');
const QRCode = require('../models/QRCode');

async function diagnose() {
  try {
    console.log('🔍 Iniciando diagnóstico de QRs en MongoDB...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // 1. Verificar solicitudes aprobadas sin QR
    const approvedWithoutQR = await Request.find({ status: 'approved' });
    const approvedIds = approvedWithoutQR.map(req => req._id);
    
    const qrCodes = await QRCode.find({ request_id: { $in: approvedIds } });
    const qrRequestIds = qrCodes.map(qr => qr.request_id.toString());
    
    const missingQRs = approvedWithoutQR.filter(req => 
      !qrRequestIds.includes(req._id.toString())
    );

    console.log(`\n📊 RESUMEN DE DIAGNÓSTICO:`);
    console.log(`   • Solicitudes aprobadas: ${approvedWithoutQR.length}`);
    console.log(`   • QRs generados: ${qrCodes.length}`);
    console.log(`   • Solicitudes aprobadas SIN QR: ${missingQRs.length}`);

    if (missingQRs.length > 0) {
      console.log(`\n⚠️  SOLICITUDES APROBADAS SIN QR:`);
      missingQRs.forEach(req => {
        console.log(`   • ID: ${req._id} | Placa: ${req.vehicle_plate} | Estudiante: ${req.student_name}`);
      });
    }

    // 2. Verificar archivos QR que existen físicamente
    let qrFilesExist = 0;
    let qrFilesMissing = 0;
    let pdfFilesExist = 0;
    let pdfFilesMissing = 0;

    console.log(`\n🔍 Verificando archivos físicos...`);
    
    for (const qr of qrCodes) {
      // Verificar imagen QR
      const qrPath = path.join(__dirname, '../../', qr.qr_image_path);
      if (fs.existsSync(qrPath)) {
        qrFilesExist++;
      } else {
        qrFilesMissing++;
        console.log(`   ❌ QR faltante: ${qr.qr_image_path}`);
      }

      // Verificar PDF
      const pdfPath = path.join(__dirname, '../../', qr.pdf_path);
      if (fs.existsSync(pdfPath)) {
        pdfFilesExist++;
      } else {
        pdfFilesMissing++;
        console.log(`   ❌ PDF faltante: ${qr.pdf_path}`);
      }
    }

    console.log(`\n📁 ARCHIVOS FÍSICOS:`);
    console.log(`   • Imágenes QR existentes: ${qrFilesExist}`);
    console.log(`   • Imágenes QR faltantes: ${qrFilesMissing}`);
    console.log(`   • PDFs existentes: ${pdfFilesExist}`);
    console.log(`   • PDFs faltantes: ${pdfFilesMissing}`);

    // 3. Verificar QRs huérfanos (sin solicitud)
    const allRequests = await Request.find({});
    const allRequestIds = allRequests.map(req => req._id.toString());
    
    const orphanQRs = qrCodes.filter(qr => 
      !allRequestIds.includes(qr.request_id.toString())
    );

    if (orphanQRs.length > 0) {
      console.log(`\n👻 QRs HUÉRFANOS (sin solicitud):`);
      orphanQRs.forEach(qr => {
        console.log(`   • QR ID: ${qr._id} | Request ID: ${qr.request_id}`);
      });
    }

    // 4. Estadísticas generales
    const totalRequests = await Request.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: 'pending' });
    const rejectedRequests = await Request.countDocuments({ status: 'rejected' });

    console.log(`\n📈 ESTADÍSTICAS GENERALES:`);
    console.log(`   • Total solicitudes: ${totalRequests}`);
    console.log(`   • Pendientes: ${pendingRequests}`);
    console.log(`   • Aprobadas: ${approvedWithoutQR.length}`);
    console.log(`   • Rechazadas: ${rejectedRequests}`);
    console.log(`   • Total QRs: ${qrCodes.length}`);

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  diagnose();
}

module.exports = { diagnose };