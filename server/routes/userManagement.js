const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { requireRole } = require('../middleware/auth');
const db = require('../config/database');

/**
 * GET /api/admin/users
 * Obtener lista de usuarios
 */
router.get('/', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const pool = db.getPool();
    const [users] = await pool.query(
      'SELECT id, email, name, role, rut, carrera, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users
 * Crear nuevo usuario
 */
router.post('/', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const { email, password, name, role, rut, carrera, phone } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, contraseña, nombre y rol son requeridos'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pool = db.getPool();

    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, rut, carrera, phone, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, name, role, rut, carrera, phone, req.session.userId]
    );

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
