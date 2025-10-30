// src/config/cors.config.js

/**
 * Configuracion de CORS (Cross-Origin Resource Sharing)
 */

// Obtener origenes permitidos desde variables de entorno
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

/**
 * Configuracion principal de CORS
 */
const corsConfig = {
  // Origen permitido
  origin: (origin, callback) => {
    // Permitir requests sin origen (como aplicaciones moviles o Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Verificar si el origen esta en la lista de permitidos
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  
  // Metodos HTTP permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Headers permitidos
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  
  // Headers expuestos al cliente
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
  ],
  
  // Permitir credenciales (cookies, authorization headers)
  credentials: true,
  
  // Tiempo de cache de preflight request (24 horas)
  maxAge: 86400,
  
  // Permitir preflight request exitoso sin Content-Type
  preflightContinue: false,
  
  // Codigo de estado para OPTIONS exitoso
  optionsSuccessStatus: 204,
};

/**
 * Configuracion de CORS para desarrollo
 */
const corsConfigDevelopment = {
  ...corsConfig,
  origin: true, // Permitir todos los origenes en desarrollo
  credentials: true,
};

/**
 * Configuracion de CORS para produccion
 */
const corsConfigProduction = {
  ...corsConfig,
  origin: corsConfig.origin, // Usar validacion estricta
  credentials: true,
};

/**
 * Obtener configuracion segun entorno
 * @returns {Object} - Configuracion de CORS
 */
const getCorsConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return corsConfigProduction;
  }
  
  return corsConfigDevelopment;
};

/**
 * Middleware personalizado para manejar errores de CORS
 * @param {Error} err - Error
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Next middleware
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message === 'No permitido por CORS') {
    res.status(403).json({
      success: false,
      error: 'Acceso denegado por CORS',
      message: 'El origen de la peticion no esta permitido',
    });
  } else {
    next(err);
  }
};

module.exports = {
  corsConfig,
  corsConfigDevelopment,
  corsConfigProduction,
  getCorsConfig,
  corsErrorHandler,
  allowedOrigins,
};