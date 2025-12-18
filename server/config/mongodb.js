const mongoose = require('mongoose');

// Debug: Mostrar variables de entorno
console.log('🔍 Variables de MongoDB:');
console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'DEFINIDO' : 'NO DEFINIDO');

/**
 * Conectar a MongoDB Atlas
 */
async function connectMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está definido en las variables de entorno');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✓ Conectado a MongoDB Atlas');
    
    // Verificar la conexión
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`✓ Base de datos MongoDB con ${collections.length} colecciones`);
    
  } catch (error) {
    console.error('✗ Error conectando a MongoDB:', error.message);
    throw error;
  }
}

/**
 * Cerrar conexión a MongoDB
 */
async function closeMongoDB() {
  await mongoose.connection.close();
  console.log('✓ Conexión a MongoDB cerrada');
}

module.exports = {
  connectMongoDB,
  closeMongoDB,
  mongoose
};