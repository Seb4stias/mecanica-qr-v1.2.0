const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Request = require('../models/Request');
const { requireRole } = require('../middleware/auth');

/**
 * GET /api/audit
 * Obtener registros de auditoría con filtros
 */
router.get('/', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const { 
      actionType, 
      performedBy, 
      targetUserId, 
      startDate, 
      endDate,
      startTime,
      endTime 
    } = req.query;

    console.log('📊 Filtros de auditoría recibidos:', { actionType, startDate, startTime, endDate, endTime });

    // Construir filtros para MongoDB
    const filters = {};

    if (actionType) {
      filters.action_type = actionType;
    }

    if (performedBy) {
      filters.performed_by = performedBy;
    }

    if (targetUserId) {
      filters.target_user_id = targetUserId;
    }

    // Filtros de fecha
    if (startDate || endDate) {
      filters.created_at = {};
      
      if (startDate) {
        const startDateTime = startTime ? `${startDate}T${startTime}:00.000Z` : `${startDate}T00:00:00.000Z`;
        filters.created_at.$gte = new Date(startDateTime);
        console.log('📊 Fecha inicio parseada:', filters.created_at.$gte);
      }
      
      if (endDate) {
        const endDateTime = endTime ? `${endDate}T${endTime}:59.999Z` : `${endDate}T23:59:59.999Z`;
        filters.created_at.$lte = new Date(endDateTime);
        console.log('📊 Fecha fin parseada:', filters.created_at.$lte);
      }
    }

    console.log('📊 Filtros MongoDB:', filters);

    // Debug: Contar todos los registros
    const totalCount = await AuditLog.countDocuments();
    console.log(`📊 Total de registros en la base de datos: ${totalCount}`);

    // Debug: Obtener algunos registros recientes para ver las fechas
    const recentLogs = await AuditLog.find().sort({ created_at: -1 }).limit(5);
    console.log('📊 Registros recientes:', recentLogs.map(log => ({
      action: log.action_type,
      date: log.created_at,
      description: log.description
    })));

    const logs = await AuditLog.find(filters)
      .populate('performed_by', 'name email')
      .populate('target_user_id', 'name email')
      .populate('target_request_id', 'student_name')
      .sort({ created_at: -1 })
      .limit(1000);

    console.log(`📊 Registros encontrados con filtros: ${logs.length}`);

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/stats
 * Obtener estadísticas de auditoría
 */
router.get('/stats', requireRole('admin_level2'), async (req, res, next) => {
  try {
    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action_type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          action_type: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
