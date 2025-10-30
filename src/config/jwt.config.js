// src/config/jwt.config.js

/**
 * Configuracion de JSON Web Tokens (JWT)
 */

const jwtConfig = {
  // Secret key para firmar tokens
  secret: process.env.JWT_SECRET || 'cambiar_este_secreto_en_produccion',
  
  // Tiempo de expiracion del token
  expiresIn: process.env.JWT_EXPIRE || '7d',
  
  // Tiempo de expiracion de la cookie (en dias)
  cookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE) || 7,
  
  // Algoritmo de firmado
  algorithm: 'HS256',
  
  // Issuer (emisor del token)
  issuer: 'gemini-api-server',
  
  // Audience (destinatario del token)
  audience: 'gemini-api-client',
  
  // Opciones de firma
  signOptions: {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'gemini-api-server',
    audience: 'gemini-api-client',
  },
  
  // Opciones de verificacion
  verifyOptions: {
    algorithms: ['HS256'],
    issuer: 'gemini-api-server',
    audience: 'gemini-api-client',
  },
  
  // Configuracion de cookies
  cookieOptions: {
    httpOnly: true, // No accesible desde JavaScript del cliente
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en produccion
    sameSite: 'strict', // Proteccion CSRF
    maxAge: (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000, // En milisegundos
  },
  
  // Nombre de la cookie
  cookieName: 'token',
  
  // Nombre del header
  headerName: 'Authorization',
  
  // Prefijo del token en el header
  bearerPrefix: 'Bearer',
};

/**
 * Configuracion de JWT para desarrollo
 */
const jwtConfigDevelopment = {
  ...jwtConfig,
  cookieOptions: {
    ...jwtConfig.cookieOptions,
    secure: false, // Permitir HTTP en desarrollo
  },
};

/**
 * Configuracion de JWT para produccion
 */
const jwtConfigProduction = {
  ...jwtConfig,
  cookieOptions: {
    ...jwtConfig.cookieOptions,
    secure: true, // Forzar HTTPS
    sameSite: 'strict',
  },
};

/**
 * Obtener configuracion segun entorno
 * @returns {Object} - Configuracion de JWT
 */
const getJwtConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return jwtConfigProduction;
  }
  
  return jwtConfigDevelopment;
};

/**
 * Validar configuracion de JWT
 * @returns {Object} - Resultado de validacion
 */
const validateJwtConfig = () => {
  const errors = [];
  
  if (!jwtConfig.secret || jwtConfig.secret === 'cambiar_este_secreto_en_produccion') {
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET no esta configurado correctamente en produccion');
    }
  }
  
  if (jwtConfig.secret.length < 32) {
    errors.push('JWT_SECRET debe tener al menos 32 caracteres');
  }
  
  if (!jwtConfig.expiresIn) {
    errors.push('JWT_EXPIRE no esta configurado');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Obtener tiempo de expiracion en milisegundos
 * @returns {number} - Tiempo en milisegundos
 */
const getExpirationMs = () => {
  const expire = jwtConfig.expiresIn;
  
  // Parsear formato como "7d", "24h", "60m", "3600s"
  const match = expire.match(/^(\d+)([dhms])$/);
  
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000; // 7 dias por defecto
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'd': // dias
      return value * 24 * 60 * 60 * 1000;
    case 'h': // horas
      return value * 60 * 60 * 1000;
    case 'm': // minutos
      return value * 60 * 1000;
    case 's': // segundos
      return value * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

module.exports = {
  jwtConfig,
  jwtConfigDevelopment,
  jwtConfigProduction,
  getJwtConfig,
  validateJwtConfig,
  getExpirationMs,
};