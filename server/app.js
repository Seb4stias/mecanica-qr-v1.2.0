const express = require('express');
const session = require('express-session');
// const MongoStore = require('connect-mongo'); // Deshabilitado temporalmente
// const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Trust proxy - necesario para Coolify/Docker
app.set('trust proxy', 1);

// Security middleware - DESHABILITADO TEMPORALMENTE PARA DESARROLLO
// if (process.env.NODE_ENV === 'production') {
//   app.use(helmet());
// }

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload será manejado por multer en las rutas específicas

// Session configuration (temporalmente sin MongoStore)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-to-a-secure-random-string',
  resave: false,
  saveUninitialized: false,
  // store: MongoStore - Deshabilitado temporalmente
  cookie: {
    secure: false, // Cambiar a true cuando tengas HTTPS configurado
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // More attempts in development
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Static files
app.use(express.static('public'));

// Middleware específico para manejar imágenes que no existen
app.use('/uploads', (req, res, next) => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../public', req.url);
  
  // Si el archivo existe, continuar normalmente
  if (fs.existsSync(filePath)) {
    return next();
  }
  
  // Si no existe, devolver un 404 apropiado sin HTML
  console.log(`⚠️ Imagen no encontrada: ${req.url}`);
  res.status(404).end(); // Terminar sin contenido
});

// Middleware para evitar que las rutas de archivos JS/CSS devuelvan HTML
app.use(['/js/*', '/css/*', '/images/*'], (req, res, next) => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../public', req.url);
  
  // Si el archivo existe, continuar normalmente
  if (fs.existsSync(filePath)) {
    return next();
  }
  
  // Si no existe, devolver 404 sin HTML
  console.log(`⚠️ Archivo estático no encontrado: ${req.url}`);
  res.status(404).end(); // Terminar sin contenido
});

// Routes
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const adminRoutes = require('./routes/admin');
const scannerRoutes = require('./routes/scanner');
const userManagementRoutes = require('./routes/userManagement');
const auditRoutes = require('./routes/audit');
const debugRoutes = require('./routes/debug');

// Apply rate limiter to login route
app.use('/api/auth/login', loginLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/admin/users', userManagementRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/debug', debugRoutes);

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
