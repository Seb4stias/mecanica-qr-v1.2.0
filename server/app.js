const express = require('express');
const session = require('express-session');
// const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware - DESHABILITADO TEMPORALMENTE PARA DESARROLLO
// if (process.env.NODE_ENV === 'production') {
//   app.use(helmet());
// }

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-to-a-secure-random-string',
  resave: false,
  saveUninitialized: false,
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

// Routes
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const adminRoutes = require('./routes/admin');
const scannerRoutes = require('./routes/scanner');
const userManagementRoutes = require('./routes/userManagement');

// Apply rate limiter to login route
app.use('/api/auth/login', loginLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/admin/users', userManagementRoutes);

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
