// src/utils/logger.js

const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Crear directorio de logs si no existe
 */
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Formato personalizado para logs
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Formato para consola con colores
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

/**
 * Configuracion del logger
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'gemini-api-server' },
  transports: [
    // Log de errores
    new winston.transports.File({
      filename: path.join(logsDir, process.env.LOG_FILE_ERROR || 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Log combinado
    new winston.transports.File({
      filename: path.join(logsDir, process.env.LOG_FILE_COMBINED || 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  
  // Manejar excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  
  // Manejar rechazos de promesas no capturados
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

/**
 * Si no estamos en produccion, loguear tambien a la consola
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

/**
 * Metodos auxiliares para logging
 */
const loggerHelpers = {
  /**
   * Log de informacion
   * @param {string} message - Mensaje
   * @param {Object} metadata - Metadata adicional
   */
  info: (message, metadata = {}) => {
    logger.info(message, metadata);
  },
  
  /**
   * Log de error
   * @param {string} message - Mensaje
   * @param {Error|Object} error - Error o metadata
   */
  error: (message, error = {}) => {
    if (error instanceof Error) {
      logger.error(message, {
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error(message, error);
    }
  },
  
  /**
   * Log de advertencia
   * @param {string} message - Mensaje
   * @param {Object} metadata - Metadata adicional
   */
  warn: (message, metadata = {}) => {
    logger.warn(message, metadata);
  },
  
  /**
   * Log de debug
   * @param {string} message - Mensaje
   * @param {Object} metadata - Metadata adicional
   */
  debug: (message, metadata = {}) => {
    logger.debug(message, metadata);
  },
  
  /**
   * Log de HTTP request
   * @param {Object} req - Request de Express
   * @param {Object} res - Response de Express
   * @param {number} responseTime - Tiempo de respuesta en ms
   */
  http: (req, res, responseTime) => {
    logger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  },
  
  /**
   * Log de autenticacion
   * @param {string} action - Accion realizada
   * @param {string} userId - ID del usuario
   * @param {boolean} success - Si fue exitoso
   * @param {Object} metadata - Metadata adicional
   */
  auth: (action, userId, success, metadata = {}) => {
    logger.info(`Auth: ${action}`, {
      userId,
      success,
      action,
      ...metadata,
    });
  },
  
  /**
   * Log de base de datos
   * @param {string} operation - Operacion realizada
   * @param {string} collection - Coleccion afectada
   * @param {Object} metadata - Metadata adicional
   */
  database: (operation, collection, metadata = {}) => {
    logger.debug(`Database: ${operation}`, {
      operation,
      collection,
      ...metadata,
    });
  },
  
  /**
   * Log de API externa (Gemini)
   * @param {string} action - Accion realizada
   * @param {boolean} success - Si fue exitoso
   * @param {Object} metadata - Metadata adicional
   */
  api: (action, success, metadata = {}) => {
    logger.info(`API: ${action}`, {
      action,
      success,
      ...metadata,
    });
  },
  
  /**
   * Log de archivo
   * @param {string} action - Accion realizada
   * @param {string} filename - Nombre del archivo
   * @param {Object} metadata - Metadata adicional
   */
  file: (action, filename, metadata = {}) => {
    logger.debug(`File: ${action}`, {
      action,
      filename,
      ...metadata,
    });
  },
  
  /**
   * Log de seguridad
   * @param {string} event - Evento de seguridad
   * @param {string} severity - Severidad (low, medium, high, critical)
   * @param {Object} metadata - Metadata adicional
   */
  security: (event, severity = 'medium', metadata = {}) => {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    logger[logLevel](`Security: ${event}`, {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },
};

/**
 * Stream para Morgan (HTTP logger middleware)
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = {
  logger,
  ...loggerHelpers,
};