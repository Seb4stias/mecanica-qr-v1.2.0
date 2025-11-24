const db = require('../config/database');

/**
 * Registra una acción en el log de auditoría
 * @param {string} actionType - Tipo de acción (user_created, user_deleted, request_approved, etc.)
 * @param {string} actionDescription - Descripción detallada de la acción
 * @param {number} performedBy - ID del usuario que realizó la acción
 * @param {number|null} targetUserId - ID del usuario afectado (opcional)
 * @param {number|null} targetRequestId - ID de la solicitud afectada (opcional)
 * @param {object|null} metadata - Datos adicionales en formato JSON (opcional)
 */
async function logAudit(actionType, actionDescription, performedBy, targetUserId = null, targetRequestId = null, metadata = null) {
  try {
    const pool = db.getPool();
    await pool.query(
      `INSERT INTO audit_log (action_type, action_description, performed_by, target_user_id, target_request_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [actionType, actionDescription, performedBy, targetUserId, targetRequestId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}

module.exports = { logAudit };
