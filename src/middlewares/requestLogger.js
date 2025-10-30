// src/middlewares/requestLogger.js

const logger = require('../utils/logger');
const { getCurrentTimestamp } = require('../utils/helpers/dateHelper');

/**
 * Middleware para registrar todas las requests HTTP
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Capturar informacion inicial de la request
  const requestInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'unknown',
    userId: req.userId || null,
    query: Object.keys(req.query).length > 0 ? req.query : null,
  };
  
  // Log de inicio de request
  logger.info(`[REQUEST] ${req.method} ${req.path}`, {
    ...requestInfo,
    body: sanitizeBody(req.body),
  });
  
  // Interceptar el metodo res.json para capturar la respuesta
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    res.body = body;
    return originalJson(body);
  };
  
  // Interceptar el metodo res.send para capturar la respuesta
  const originalSend = res.send.bind(res);
  res.send = function(body) {
    res.body = body;
    return originalSend(body);
  };
  
  // Capturar cuando la respuesta termina
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const responseInfo = {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0,
    };
    
    // Determinar nivel de log segun status code
    const logLevel = getLogLevel(res.statusCode);
    
    logger[logLevel](`[RESPONSE] ${req.method} ${req.path}`, {
      ...requestInfo,
      ...responseInfo,
      success: res.statusCode < 400,
    });
  });
  
  next();
};

/**
 * Middleware para registrar solo errores
 */
const errorOnlyLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      const duration = Date.now() - startTime;
      
      logger.error(`[ERROR] ${req.method} ${req.path}`, {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userId: req.userId || null,
        userAgent: req.get('user-agent'),
        body: sanitizeBody(req.body),
      });
    }
  });
  
  next();
};

/**
 * Middleware para registrar requests lentas
 */
const slowRequestLogger = (thresholdMs = 3000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > thresholdMs) {
        logger.warn(`[SLOW REQUEST] ${req.method} ${req.path}`, {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl || req.url,
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
          statusCode: res.statusCode,
          ip: req.ip,
          userId: req.userId || null,
        });
      }
    });
    
    next();
  };
};

/**
 * Middleware para registrar requests de usuarios especificos
 */
const userActivityLogger = (req, res, next) => {
  if (!req.userId) {
    return next();
  }
  
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info(`[USER ACTIVITY] ${req.userId}`, {
      timestamp: new Date().toISOString(),
      userId: req.userId,
      username: req.user?.username || 'unknown',
      action: `${req.method} ${req.path}`,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  
  next();
};

/**
 * Middleware para registrar accesos a recursos sensibles
 */
const sensitiveResourceLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.warn(`[SENSITIVE ACCESS] ${req.method} ${req.path}`, {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      userId: req.userId || 'anonymous',
      username: req.user?.username || 'unknown',
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      success: res.statusCode < 400,
    });
  });
  
  next();
};

/**
 * Middleware para registrar intentos de autenticacion
 */
const authAttemptLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    logger.info(`[AUTH ATTEMPT] ${success ? 'SUCCESS' : 'FAILED'}`, {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.path,
      email: req.body?.email || 'not provided',
      success,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
};

/**
 * Middleware para registrar uploads de archivos
 */
const fileUploadLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    if (req.file || req.files) {
      const duration = Date.now() - startTime;
      
      const fileInfo = req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      } : {
        count: req.files?.length || 0,
        files: req.files?.map(f => ({
          filename: f.filename,
          size: f.size,
          mimetype: f.mimetype,
        })),
      };
      
      logger.info(`[FILE UPLOAD] ${req.path}`, {
        timestamp: new Date().toISOString(),
        userId: req.userId || 'anonymous',
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ...fileInfo,
        ip: req.ip,
      });
    }
  });
  
  next();
};

/**
 * Middleware para registrar llamadas a APIs externas
 */
const externalAPILogger = (apiName) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.info(`[EXTERNAL API] ${apiName}`, {
        timestamp: new Date().toISOString(),
        api: apiName,
        endpoint: req.path,
        userId: req.userId || 'anonymous',
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: res.statusCode < 400,
      });
    });
    
    next();
  };
};

/**
 * Sanitizar body para remover informacion sensible de los logs
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = [
    'password',
    'newPassword',
    'currentPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
  ];
  
  const sanitized = { ...body };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Determinar nivel de log segun status code
 */
const getLogLevel = (statusCode) => {
  if (statusCode >= 500) {
    return 'error';
  } else if (statusCode >= 400) {
    return 'warn';
  } else {
    return 'info';
  }
};

/**
 * Crear un logger personalizado con opciones
 */
const createCustomLogger = (options = {}) => {
  const {
    logBody = true,
    logQuery = true,
    logHeaders = false,
    logResponse = false,
    sensitiveRoutes = [],
  } = options;
  
  return (req, res, next) => {
    const startTime = Date.now();
    const isSensitive = sensitiveRoutes.some(route => req.path.includes(route));
    
    const requestInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userId: req.userId || null,
    };
    
    if (logQuery && Object.keys(req.query).length > 0) {
      requestInfo.query = req.query;
    }
    
    if (logBody && req.body) {
      requestInfo.body = sanitizeBody(req.body);
    }
    
    if (logHeaders) {
      requestInfo.headers = req.headers;
    }
    
    logger.info(`[REQUEST] ${req.method} ${req.path}`, requestInfo);
    
    if (logResponse) {
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        res.body = body;
        return originalJson(body);
      };
    }
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = isSensitive ? 'warn' : getLogLevel(res.statusCode);
      
      const responseInfo = {
        ...requestInfo,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };
      
      if (logResponse && res.body) {
        responseInfo.response = res.body;
      }
      
      logger[logLevel](`[RESPONSE] ${req.method} ${req.path}`, responseInfo);
    });
    
    next();
  };
};

module.exports = {
  requestLogger,
  errorOnlyLogger,
  slowRequestLogger,
  userActivityLogger,
  sensitiveResourceLogger,
  authAttemptLogger,
  fileUploadLogger,
  externalAPILogger,
  createCustomLogger,
};