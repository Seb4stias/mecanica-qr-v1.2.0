const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./server/models/User');
const Request = require('./server/models/Request');
const AuditLog = require('./server/models/AuditLog');

async function importData() {
  try {
    // Conectar a MongoDB (usa la variable de entorno o pide el URI)
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mecanica';
    
    console.log('🔗 Conectando a MongoDB...');
    console.log('URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Oculta la contraseña
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB\n');
    
    // Leer datos exportados
    const data = JSON.parse(fs.readFileSync('mysql-backup.json', 'utf8'));
    
    console.log('📦 Importando datos...\n');
    
    // Mapeo de IDs antiguos a nuevos
    const userIdMap = {};
    const requestIdMap = {};
    
    // Importar usuarios
    if (data.users && data.users.length > 0) {
      for (const user of data.users) {
        const newUser = await User.create({
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          rut: user.rut,
          role: user.role,
          carrera: user.carrera,
          phone: user.phone,
          is_active: user.is_active === 1,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        });
        userIdMap[user.id] = newUser._id;
      }
      console.log(`✅ Usuarios importados: ${data.users.length}`);
    }
    
    // Importar solicitudes
    if (data.requests && data.requests.length > 0) {
      for (const req of data.requests) {
        const newRequest = await Request.create({
          user_id: userIdMap[req.user_id],
          student_name: req.student_name,
          student_rut: req.student_rut,
          student_carrera: req.student_carrera,
          student_email: req.student_email,
          student_phone: req.student_phone,
          activity_type: req.activity_type,
          activity_description: req.activity_description,
          vehicle_plate: req.vehicle_plate,
          vehicle_model: req.vehicle_model,
          vehicle_color: req.vehicle_color,
          vehicle_photo_path: req.vehicle_photo_path,
          vehicle_id_photo_path: req.vehicle_id_photo_path,
          garage_location: req.garage_location,
          modifications_description: req.modifications_description,
          status: req.status,
          level1_approved: req.level1_approved === 1,
          level1_admin_id: userIdMap[req.level1_admin_id],
          level1_date: req.level1_date,
          level1_comments: req.level1_comments,
          level2_approved: req.level2_approved === 1,
          level2_admin_id: userIdMap[req.level2_admin_id],
          level2_date: req.level2_date,
          level2_comments: req.level2_comments,
          denial_reason: req.denial_reason,
          denied_by_level: req.denied_by_level,
          created_by_admin: req.created_by_admin === 1,
          created_by_admin_id: userIdMap[req.created_by_admin_id],
          createdAt: req.created_at,
          updatedAt: req.updated_at
        });
        requestIdMap[req.id] = newRequest._id;
      }
      console.log(`✅ Solicitudes importadas: ${data.requests.length}`);
    }
    
    // Importar logs de auditoría
    if (data.auditLogs && data.auditLogs.length > 0) {
      for (const log of data.auditLogs) {
        await AuditLog.create({
          action_type: log.action_type,
          action_description: log.action_description,
          performed_by: userIdMap[log.performed_by],
          target_user_id: userIdMap[log.target_user_id],
          target_request_id: requestIdMap[log.target_request_id],
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
          created_at: log.created_at
        });
      }
      console.log(`✅ Logs de auditoría importados: ${data.auditLogs.length}`);
    }
    
    console.log('\n🎉 Importación completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

importData();
