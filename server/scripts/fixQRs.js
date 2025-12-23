require('dotenv').config();
const mongoose = require('mongoose');
const QRCodeModel = require('../models/QRCode');
const Request = require('../models/Request');

async function fixQRs() {
  try {
    console.log('🔧 Arreglando QRs...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // 1. Eliminar todos los QRs existentes (están mal)
    const deletedCount = await QRCodeModel.deleteMany({});
    console.log(`🗑️ Eliminados ${deletedCount.deletedCount} QRs viejos`);

    // 2. Buscar todas las solicitudes aprobadas
    const approvedRequests = await Request.find({ status: 'approved' });
    console.log(`📋 Encontradas ${approvedRequests.length} solicitudes aprobadas`);

    // 3. Regenerar QRs para cada solicitud aprobada
    for (const request of approvedRequests) {
      console.log(`🔄 Regenerando QR para solicitud ${request._id} (${request.vehicle_plate})`);
      
      const qrData = JSON.stringify({
        requestId: request._id.toString(),
        plate: request.vehicle_plate,
        studentName: request.student_name,
        studentRut: request.student_rut,
        generatedAt: new Date().toISOString()
      });

      // Calcular fecha de expiración
      const expiryDays = parseInt(process.env.QR_EXPIRY_DAYS) || 30;
      const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

      const qrCode = new QRCodeModel({
        request_id: request._id,
        qr_code: qrData,
        qr_image_path: `public/qr-codes/qr-${request._id}.png`,
        pdf_path: `public/qr-codes/permit-${request._id}.pdf`,
        expires_at: expiresAt,
        is_active: true
      });

      await qrCode.save();
      console.log(`✅ QR creado para ${request.vehicle_plate}`);
    }

    // 4. Verificar que todo esté bien
    const newQRs = await QRCodeModel.find({ is_active: true });
    console.log(`\n📊 RESUMEN:`);
    console.log(`   • QRs activos creados: ${newQRs.length}`);
    
    // Probar búsqueda con el primer QR
    if (newQRs.length > 0) {
      const testQR = newQRs[0];
      const parsedData = JSON.parse(testQR.qr_code);
      
      console.log(`\n🧪 PRUEBA DE BÚSQUEDA:`);
      console.log(`   • RequestId en QR: ${parsedData.requestId}`);
      console.log(`   • RequestId en BD: ${testQR.request_id}`);
      
      const foundQR = await QRCodeModel.findOne({
        request_id: parsedData.requestId,
        is_active: true
      });
      
      console.log(`   • Búsqueda exitosa: ${foundQR ? '✅ SÍ' : '❌ NO'}`);
    }

    console.log('\n✅ Arreglo completado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

if (require.main === module) {
  fixQRs();
}

module.exports = { fixQRs };