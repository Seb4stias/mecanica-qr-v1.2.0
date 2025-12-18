const AuditLog = require('../models/AuditLog');

/**
 * Registra una acción en el log de auditoría
 * @param {string} actionType - Tipo de acción (user_created, user_deleted, request_approved, etc.)
 * @param {string} actionDescription - Descripción detallada de la acción
 * @param {string} performedBy - ID del usuario que realizó la acción (ObjectId)
 * @param {string|null} targetUserId - ID del usuario afectado (opcional)
 * @param {string|null} targetRequestId - ID de la solicitud afectada (opcional)
 * @param {object|null} metadata - Datos adicionales en formato JSON (opcional)
 */
async function logAudit(actionType, actionDescription, performedBy, targetUserId = null, targetRequestId = null, metadata = null) {
  try {
    const auditLog = new AuditLog({
      action_type: actionType,
      action_description: actionDescription,
      performed_by: performedBy,
      target_user_id: targetUserId,
      target_request_id: targetRequestId,
      metadata: metadata
    });

    await auditLog.save();
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}

module.exports = { logAudit };
