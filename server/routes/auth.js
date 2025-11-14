const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');

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

    const pool = db.getPool();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE rut = ? AND is_active = 1',
      [rut]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Crear sesión
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
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

    const pool = db.getPool();

    // Verificar si el email ya existe
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Verificar si el RUT ya existe (si se proporcionó)
    if (rut) {
      const [existingRut] = await pool.query(
        'SELECT id FROM users WHERE rut = ?',
        [rut]
      );

      if (existingRut.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'El RUT ya está registrado'
        });
      }
    }

    // Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario con rol de estudiante
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, rut, carrera, phone, is_active)
       VALUES (?, ?, ?, 'student', ?, ?, ?, 1)`,
      [email, passwordHash, name, rut, carrera, phone]
    );

    // Crear sesión automáticamente
    req.session.userId = result.insertId;
    req.session.userEmail = email;
    req.session.userRole = 'student';
    req.session.userName = name;

    res.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: result.insertId,
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
router.get('/session', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        email: req.session.userEmail,
        name: req.session.userName,
        role: req.session.userRole
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'No hay sesión activa'
    });
  }
});

module.exports = router;
