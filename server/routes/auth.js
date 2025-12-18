const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', async (req, res, next) => {
  try {
    const { rut, password } = req.body;

    if (!rut || !password) {
      return res.status(400).json({
        success: false,
        message: 'RUT y contraseña son requeridos'
      });
    }

    const user = await User.findOne({ rut, is_active: true });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Crear sesión
    req.session.userId = user._id.toString();
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    console.log('✅ Sesión creada para:', user.name, '- ID:', user.id, '- Rol:', user.role);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register
 * Registrar nuevo usuario (estudiante)
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, rut, email, password, carrera, phone } = req.body;

    // Validaciones
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el email ya existe
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Verificar si el RUT ya existe (si se proporcionó)
    if (rut) {
      const existingRut = await User.findOne({ rut });
      if (existingRut) {
        return res.status(409).json({
          success: false,
          message: 'El RUT ya está registrado'
        });
      }
    }

    // Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario con rol de estudiante
    const newUser = new User({
      email,
      password_hash: passwordHash,
      name,
      role: 'student',
      rut,
      carrera,
      phone,
      is_active: true
    });

    const savedUser = await newUser.save();

    // Registrar en auditoría
    await logAudit('user_registered', `Usuario registrado: ${name} (${email})`, savedUser._id, savedUser._id, null, { rut, carrera });

    // Crear sesión automáticamente
    req.session.userId = savedUser._id.toString();
    req.session.userEmail = email;
    req.session.userRole = 'student';
    req.session.userName = name;

    res.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: savedUser._id,
        email: email,
        name: name,
        role: 'student'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  });
});

/**
 * GET /api/auth/session
 * Verificar sesión actual
 */
router.get('/session', async (req, res, next) => {
  try {
    console.log('🔍 Verificando sesión... Session ID:', req.sessionID);
    console.log('🔍 Session data:', req.session);
    
    if (req.session && req.session.userId) {
      console.log('✅ Sesión encontrada para user ID:', req.session.userId);
      
      // Obtener datos actualizados del usuario
      const user = await User.findById(req.session.userId, 'email name role rut carrera phone is_active');
      
      if (user && user.is_active) {
        console.log('✅ Usuario encontrado:', user.name, '- Rol:', user.role);
        res.json({
          success: true,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            rut: user.rut,
            carrera: user.carrera,
            phone: user.phone
          }
        });
      } else {
        console.log('❌ Usuario no encontrado en BD');
        res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
    } else {
      console.log('❌ No hay sesión activa');
      res.status(401).json({
        success: false,
        message: 'No hay sesión activa'
      });
    }
  } catch (error) {
    console.error('💥 Error en /session:', error);
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Cambiar contraseña del usuario actual
 */
router.post('/change-password', async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son requeridas'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Verificar contraseña actual
    const user = await User.findById(req.session.userId, 'password_hash');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }
    
    // Actualizar contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.session.userId, { password_hash: newPasswordHash });
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
