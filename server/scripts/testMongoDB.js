// No usar dotenv por ahora, las variables vienen de Coolify
const { connectMongoDB } = require('../config/mongodb');
const User = require('../models/User');

async function testConnection() {
  try {
    console.log('🔄 Probando conexión a MongoDB Atlas...');
    
    // Conectar
    await connectMongoDB();
    
    // Probar crear un usuario de prueba
    console.log('👤 Creando usuario admin por defecto...');
    await User.createDefaultAdmin();
    
    // Contar usuarios
    const userCount = await User.countDocuments();
    console.log(`✅ Conexión exitosa! Usuarios en BD: ${userCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
}

testConnection();