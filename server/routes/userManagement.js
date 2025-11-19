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

/**
 * PUT /api/admin/users/:id/role
 * Cambiar rol de usuario
 */
router.put('/:id/role', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'El rol es requerido'
      });
    }

    const validRoles = ['student', 'scanner', 'admin_level1', 'admin_level2'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }

    const pool = db.getPool();
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id/password
 * Cambiar contraseña de usuario (por admin)
 */
router.put('/:id/password', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const pool = db.getPool();
    
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id/toggle-active
 * Activar/Desactivar usuario
 */
router.put('/:id/toggle-active', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const userId = req.params.id;
    const pool = db.getPool();

    // Obtener estado actual
    const [users] = await pool.query('SELECT is_active FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const newStatus = users[0].is_active ? 0 : 1;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);

    res.json({
      success: true,
      message: newStatus ? 'Usuario activado' : 'Usuario desactivado',
      isActive: newStatus
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Eliminar usuario
 */
router.delete('/:id', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const userId = req.params.id;
    const pool = db.getPool();

    // No permitir eliminar al propio usuario
    if (parseInt(userId) === req.session.userId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    // Verificar que el usuario existe
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar el usuario
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
});
