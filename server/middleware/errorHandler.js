/**
 * Middleware de manejo de errores global
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Error de validación
  if (err.name === 'ValidationError') {
    const validationErrors = {};
    for (let field in err.errors) {
      validationErrors[field] = err.errors[field].message;
    }
    
    console.error('❌ Errores de validación:', validationErrors);
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: validationErrors,
      details: Object.values(validationErrors).join(', ')
    });
  }

  // Error de base de datos
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'El registro ya existe'
    });
  }

  // Error por defecto
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
}

module.exports = errorHandler;
