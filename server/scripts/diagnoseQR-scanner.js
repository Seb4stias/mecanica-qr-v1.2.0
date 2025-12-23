require('dotenv').config();
const mongoose = require('mongoose');
const QRCodeModel = require('../models/QRCode');
const Request = require('../models/Request');

async function diagnoseScanner() {
  try {
    console.log('🔍 Iniciando diagnóstico del escáner QR...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // 1. Verificar solicitudes aprobadas
    const approvedRequests = await Request.find({ status: 'approved' });
    console.log(`\n📊 Solicitudes aprobadas: ${approvedRequests.length}`);

    // 2. Verificar QRs activos
    const activeQRs = await QRCodeModel.find({ is_active: true });
    console.log(`📊 QRs activos: ${activeQRs.length}`);

    // 3. Mostrar detalles de cada QR
    for (const qr of activeQRs) {
      console.log(`\n🔍 QR ID: ${qr._id}`);
      console.log(`   Request ID: ${qr.request_id}`);
      console.log(`   QR Code Content: ${qr.qr_code.substring(0, 100)}...`);
      console.log(`   Is Active: ${qr.is_active}`);
      console.log(`   Expires At: ${qr.expires_at}`);
      
      // Parsear el contenido del QR
      try {
        const parsedQR = JSON.parse(qr.qr_code);
        console.log(`   Parsed requestId: ${parsedQR.requestId}`);
        console.log(`   Parsed plate: ${parsedQR.plate}`);
      } catch (e) {
        console.log(`   ❌ Error parseando QR: ${e.message}`);
      }

      // Verificar si la solicitud existe
      const request = await Request.findById(qr.request_id);
      if (request) {
        console.log(`   ✅ Solicitud encontrada: ${request.vehicle_plate} - Status: ${request.status}`);
      } else {
        console.log(`   ❌ Solicitud NO encontrada para ID: ${qr.request_id}`);
      }
    }

    // 4. Simular búsqueda del escáner
    if (activeQRs.length > 0) {
      const testQR = activeQRs[0];
      const parsedData = JSON.parse(testQR.qr_code);
      
      console.log(`\n🧪 SIMULANDO BÚSQUEDA DEL ESCÁNER:`);
      console.log(`   Buscando requestId: ${parsedData.requestId}`);
      
      const foundQR = await QRCodeModel.findOne({
        request_id: parsedData.requestId,
        is_active: true
      }).populate('request_id');
      
      if (foundQR) {
        console.log(`   ✅ QR encontrado por el escáner`);
        console.log(`   ✅ Solicitud poblada: ${foundQR.request_id.vehicle_plate}`);
      } else {
        console.log(`   ❌ QR NO encontrado por el escáner`);
      }
    }

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
  diagnoseScanner();
}

module.exports = { diagnoseScanner };