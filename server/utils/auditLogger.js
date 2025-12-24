const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Request = require('../models/Request');

/**
 * Registra una acción en el log de auditoría con información completa
 * @param {string} actionType - Tipo de acción
 * @param {string} description - Descripción de la acción
 * @param {string} performedBy - ID del usuario que realizó la acción
 * @param {string|null} targetUserId - ID del usuario afectado (opcional)
 * @param {string|null} targetRequestId - ID de la solicitud afectada (opcional)
 * @param {object|null} additionalData - Datos adicionales (opcional)
 * @param {object|null} req - Request object para obtener IP y User-Agent (opcional)
 */
async function logAudit(actionType, description, performedBy, targetUserId = null, targetRequestId = null, additionalData = null, req = null) {
  try {
    console.log(`🔍 AUDIT DEBUG: Intentando registrar auditoría:`, {
      actionType,
      description,
      performedBy,
      targetUserId,
      targetRequestId
    });

    // Obtener información del usuario que realizó la acción
    const performedByUser = await User.findById(performedBy, 'name rut email');
    console.log(`🔍 AUDIT DEBUG: Usuario que realizó la acción:`, performedByUser);
    
    // Obtener información del usuario objetivo si existe
    let targetUserInfo = null;
    if (targetUserId) {
      targetUserInfo = await User.findById(targetUserId, 'name rut email');
      console.log(`🔍 AUDIT DEBUG: Usuario objetivo:`, targetUserInfo);
    }
    
    // Obtener información de la solicitud si existe
    let targetRequestInfo = null;
    if (targetRequestId) {
      targetRequestInfo = await Request.findById(targetRequestId, 'vehicle_plate student_name student_rut');
      console.log(`🔍 AUDIT DEBUG: Solicitud objetivo:`, targetRequestInfo);
    }

    const auditLogData = {
      action_type: actionType,
      description: description,
      performed_by: performedBy,
      performed_by_name: performedByUser?.name || 'Usuario desconocido',
      performed_by_rut: performedByUser?.rut || null,
      target_user_id: targetUserId,
      target_user_name: targetUserInfo?.name || null,
      target_user_rut: targetUserInfo?.rut || null,
      target_request_id: targetRequestId,
      target_request_plate: targetRequestInfo?.vehicle_plate || null,
      ip_address: req ? (req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']) : null,
      user_agent: req ? req.headers['user-agent'] : null,
      additional_data: additionalData
    };

    console.log(`🔍 AUDIT DEBUG: Datos del log a guardar:`, auditLogData);

    const auditLog = new AuditLog(auditLogData);
    const savedLog = await auditLog.save();
    
    console.log(`✅ AUDIT DEBUG: Auditoría guardada exitosamente:`, savedLog._id);
    console.log(`📝 Auditoría registrada: ${actionType} por ${performedByUser?.name}`);
  } catch (error) {
    console.error('❌ AUDIT DEBUG: Error registrando auditoría:', error);
    console.error('❌ AUDIT DEBUG: Stack trace:', error.stack);
  }
}

/**
 * Función específica para registrar escaneos de QR
 */
async function logQRScan(performedBy, requestId, success, vehiclePlate, studentName, req = null) {
  const actionType = success ? 'qr_scan_success' : 'qr_scan_failed';
  const description = success 
    ? `QR escaneado exitosamente para vehículo ${vehiclePlate} de ${studentName}`
    : `Intento fallido de escaneo QR para vehículo ${vehiclePlate}`;
    
  await logAudit(actionType, description, performedBy, null, requestId, {
    vehicle_plate: vehiclePlate,
    student_name: studentName,
    scan_success: success
  }, req);
}

module.exports = { logAudit, logQRScan };
