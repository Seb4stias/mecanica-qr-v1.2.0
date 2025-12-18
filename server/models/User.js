const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin_level2', 'admin_level1', 'student', 'scanner'],
    default: 'student'
  },
  rut: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  carrera: {
    type: String,
    trim: true,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updated_at
userSchema.pre('save', function() {
  this.updated_at = new Date();
});

// Método para verificar contraseña
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

// Método estático para crear admin por defecto
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const existing = await this.findOne({ role: 'admin_level2' });
    
    if (!existing) {
      const adminName = process.env.ADMIN_NAME || 'Administrador';
      const adminRut = process.env.ADMIN_RUT || '99999999-9';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@inacap.cl';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      const admin = new this({
        email: adminEmail,
        password_hash: passwordHash,
        name: adminName,
        role: 'admin_level2',
        rut: adminRut,
        is_active: true
      });

      await admin.save();
      console.log(`✓ Usuario admin creado: ${adminRut} / ${adminEmail}`);
      console.log('⚠️  CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE');
    }
  } catch (error) {
    console.error('⚠️  Error al crear usuario admin:', error.message);
  }
};

module.exports = mongoose.model('User', userSchema);