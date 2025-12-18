require('dotenv').config();
const { connectMongoDB } = require('./config/mongodb');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 6777;

/**
 * Crear usuario administrador por defecto
 */
async function createDefaultAdmin() {
  try {
    await User.createDefaultAdmin();
  } catch (error) {
    console.error('⚠️  Error al crear usuario admin:', error.message);
  }
}

/**
 * Crear directorios necesarios
 */
function createRequiredDirectories() {
  const directories = [
    path.join(__dirname, '../public/qr-codes'),
    path.join(__dirname, '../public/uploads')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Directorio creado: ${dir}`);
    }
  });
}

/**
 * Ejecutar migraciones de MongoDB (si es necesario)
 */
async function runMigrations() {
  try {
    console.log('🔄 Verificando migraciones MongoDB...');
    // En MongoDB no necesitamos migraciones como en SQL
    // Los esquemas se crean automáticamente
    console.log('✅ MongoDB: No se requieren migraciones');
  } catch (error) {
    console.error('⚠️  Error en migraciones:', error.message);
  }
}

/**
 * Configuración automática de MongoDB al iniciar
 */
async function setupDatabase() {
  try {
    // Conectar a MongoDB Atlas
    await connectMongoDB();
    
    // Verificar si es primera vez (no hay usuarios admin)
    const existingAdmin = await User.findOne({ role: 'admin_level2' });
    
    if (!existingAdmin) {
      console.log('📋 Inicializando MongoDB por primera vez...');
      console.log('👤 Creando usuario administrador...');
      await createDefaultAdmin();
      console.log('✓ Setup completo');
    } else {
      console.log('✓ MongoDB ya configurado con usuario admin');
      
      // Ejecutar migraciones si es necesario
      await runMigrations();
    }

  } catch (error) {
    console.error('⚠️  Error al configurar MongoDB:', error.message);
    throw error; // Lanzar el error para que el servidor NO arranque
  }
}

// Crear directorios necesarios primero
console.log('📁 Creando directorios necesarios...');
createRequiredDirectories();

// Configurar base de datos y luego iniciar servidor
console.log('🔄 Iniciando configuración de base de datos...');
setupDatabase()
  .then(() => {
    console.log('✓ Base de datos lista, importando aplicación...');
    // Importar app DESPUÉS de que la base de datos esté lista
    const app = require('./app');
    
    console.log('✓ Aplicación cargada, iniciando servidor...');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Base de datos MongoDB Atlas conectada`);
    });
  })
  .catch((error) => {
    console.error('✗ Error fatal al iniciar:', error);
    process.exit(1);
  });
