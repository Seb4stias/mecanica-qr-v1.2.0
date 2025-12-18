const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { requireRole } = require('../middleware/auth');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/admin/users
 * Obtener lista de usuarios
 */
router.get('/', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const users = await User.find({}, 'email name role rut carrera phone is_active created_at')
      .sort({ created_at: -1 });

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

    const newUser = new User({
      email,
      password_hash: passwordHash,
      name,
      role,
      rut,
      carrera,
      phone,
      created_by: req.session.userId
    });

    const savedUser = await newUser.save();

    // Registrar en auditoría
    await logAudit('user_created', `Usuario creado por admin: ${name} (${email}) con rol ${role}`, req.session.userId, savedUser._id, null, { rut, role });

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      userId: savedUser._id
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

    // Obtener info del usuario antes del cambio
    const user = await User.findById(userId, 'name email role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const oldRole = user.role;
    
    await User.findByIdAndUpdate(userId, { role });

    // Registrar en auditoría
    await logAudit('user_role_changed', `Rol cambiado de ${oldRole} a ${role} para usuario ${user.name}`, req.session.userId, userId, null, { oldRole, newRole: role });

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
    
    // Obtener info del usuario
    const user = await User.findById(userId, 'name email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    await User.findByIdAndUpdate(userId, { password_hash: passwordHash });

    // Registrar en auditoría
    await logAudit('user_password_changed', `Contraseña cambiada por admin para usuario ${user.name}`, req.session.userId, userId);

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

    // Obtener estado actual
    const user = await User.findById(userId, 'is_active name email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const newStatus = !user.is_active;
    await User.findByIdAndUpdate(userId, { is_active: newStatus });

    // Registrar en auditoría
    const action = newStatus ? 'activado' : 'desactivado';
    await logAudit('user_status_changed', `Usuario ${user.name} ${action}`, req.session.userId, userId, null, { oldStatus: user.is_active, newStatus });

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

    // No permitir eliminar al propio usuario
    if (userId === req.session.userId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId, 'name email role');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Registrar en auditoría antes de eliminar
    await logAudit('user_deleted', `Usuario eliminado: ${user.name} (${user.email})`, req.session.userId, userId, null, { deletedUser: user });

    // Eliminar el usuario
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
});
