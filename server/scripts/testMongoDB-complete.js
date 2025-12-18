require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Request = require('../models/Request');
const QRCode = require('../models/QRCode');
const AuditLog = require('../models/AuditLog');

async function testMongoDB() {
  try {
    console.log('🧪 Probando conexión y modelos de MongoDB...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // 1. Probar modelo User
    console.log('\n👤 Probando modelo User...');
    const testUser = new User({
      email: 'test@example.com',
      password_hash: 'hashedpassword123',
      name: 'Usuario de Prueba',
      role: 'user',
      rut: '12345678-9',
      carrera: 'Ingeniería',
      phone: '+56912345678'
    });

    await testUser.save();
    console.log('✓ Usuario de prueba creado:', testUser._id);

    // 2. Probar modelo Request
    console.log('\n📝 Probando modelo Request...');
    const testRequest = new Request({
      user_id: testUser._id,
      student_name: 'Estudiante Prueba',
      student_rut: '98765432-1',
      student_carrera: 'Ingeniería Informática',
      student_email: 'estudiante@test.com',
      student_phone: '+56987654321',
      activity_type: 'academica',
      activity_description: 'Proyecto de tesis',
      vehicle_plate: 'TEST123',
      vehicle_model: 'Toyota Corolla',
      vehicle_color: 'Blanco',
      garage_location: 'Estacionamiento A',
      status: 'pending'
    });

    await testRequest.save();
    console.log('✓ Solicitud de prueba creada:', testRequest._id);

    // 3. Probar modelo QRCode
    console.log('\n📱 Probando modelo QRCode...');
    const testQR = new QRCode({
      request_id: testRequest._id,
      qr_code: 'TEST-QR-CODE-123',
      qr_image_path: 'public/qr-codes/test-qr.png',
      pdf_path: 'public/pdfs/test-form.pdf'
    });

    await testQR.save();
    console.log('✓ QR de prueba creado:', testQR._id);

    // 4. Probar modelo AuditLog
    console.log('\n📋 Probando modelo AuditLog...');
    const testLog = new AuditLog({
      action_type: 'request_created',
      performed_by: testUser._id,
      target_request_id: testRequest._id,
      description: 'Solicitud de prueba creada',
      ip_address: '127.0.0.1',
      user_agent: 'Test Script'
    });

    await testLog.save();
    console.log('✓ Log de auditoría creado:', testLog._id);

    // 5. Probar consultas con populate
    console.log('\n🔍 Probando consultas con populate...');
    
    const requestWithUser = await Request.findById(testRequest._id)
      .populate('user_id', 'name email');
    console.log('✓ Solicitud con usuario:', {
      plate: requestWithUser.vehicle_plate,
      user: requestWithUser.user_id.name
    });

    const logWithRefs = await AuditLog.findById(testLog._id)
      .populate('performed_by', 'name email')
      .populate('target_request_id', 'vehicle_plate');
    console.log('✓ Log con referencias:', {
      action: logWithRefs.action_type,
      user: logWithRefs.performed_by.name,
      request: logWithRefs.target_request_id.vehicle_plate
    });

    // 6. Probar agregaciones
    console.log('\n📊 Probando agregaciones...');
    const stats = await Request.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('✓ Estadísticas por status:', stats);

    // 7. Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await AuditLog.findByIdAndDelete(testLog._id);
    await QRCode.findByIdAndDelete(testQR._id);
    await Request.findByIdAndDelete(testRequest._id);
    await User.findByIdAndDelete(testUser._id);
    console.log('✓ Datos de prueba eliminados');

    console.log('\n✅ TODAS LAS PRUEBAS PASARON');
    console.log('═══════════════════════════════════════');
    console.log('   👤 Modelo User: ✓');
    console.log('   📝 Modelo Request: ✓');
    console.log('   📱 Modelo QRCode: ✓');
    console.log('   📋 Modelo AuditLog: ✓');
    console.log('   🔍 Consultas populate: ✓');
    console.log('   📊 Agregaciones: ✓');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error en pruebas:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testMongoDB();
}

module.exports = { testMongoDB };