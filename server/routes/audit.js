const express = require('express');
const router = express.Router();
const db = require('../config/database');
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

    const pool = db.getPool();
    
    let query = `
      SELECT 
        a.*,
        u1.name as performed_by_name,
        u1.email as performed_by_email,
        u2.name as target_user_name,
        u2.email as target_user_email,
        r.student_name as request_student_name
      FROM audit_log a
      LEFT JOIN users u1 ON a.performed_by = u1.id
      LEFT JOIN users u2 ON a.target_user_id = u2.id
      LEFT JOIN requests r ON a.target_request_id = r.id
      WHERE 1=1
    `;
    
    const params = [];

    if (actionType) {
      query += ' AND a.action_type = ?';
      params.push(actionType);
    }

    if (performedBy) {
      query += ' AND a.performed_by = ?';
      params.push(performedBy);
    }

    if (targetUserId) {
      query += ' AND a.target_user_id = ?';
      params.push(targetUserId);
    }

    if (startDate) {
      if (startTime) {
        query += ' AND a.created_at >= ?';
        params.push(`${startDate} ${startTime}`);
      } else {
        query += ' AND a.created_at >= ?';
        params.push(`${startDate} 00:00:00`);
      }
    }

    if (endDate) {
      if (endTime) {
        query += ' AND a.created_at <= ?';
        params.push(`${endDate} ${endTime}`);
      } else {
        query += ' AND a.created_at <= ?';
        params.push(`${endDate} 23:59:59`);
      }
    }

    query += ' ORDER BY a.created_at DESC LIMIT 1000';

    console.log('📊 Query SQL:', query);
    console.log('📊 Parámetros:', params);

    const [logs] = await pool.query(query, params);

    console.log(`📊 Registros encontrados: ${logs.length}`);

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
    const pool = db.getPool();
    
    const [stats] = await pool.query(`
      SELECT 
        action_type,
        COUNT(*) as count
      FROM audit_log
      GROUP BY action_type
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
