// src/middlewares/requestLogger.js

const logger = require('../utils/logger');
const { getCurrentTimestamp } = require('../utils/helpers/dateHelper');

/**
 * Middleware para registrar todas las requests HTTP
 * NOTA: El userId se captura al finalizar la request, después del middleware de autenticación
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Capturar información inicial de la request (SIN userId aún)
  const initialInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'unknown',
    query: Object.keys(req.query).length > 0 ? req.query : null,
  };
  
  // Log de inicio de request (sin userId porque aún no se ejecutó authenticate)
  logger.info(`[REQUEST] ${req.method} ${req.path}`, {
    ...initialInfo,
    body: sanitizeBody(req.body),
  });
  
  // Interceptar el método res.json para capturar la respuesta
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    res.body = body;
    return originalJson(body);
  };
  
  // Interceptar el método res.send para capturar la respuesta
  const originalSend = res.send.bind(res);
  res.send = function(body) {
    res.body = body;
    return originalSend(body);
  };
  
  // Capturar cuando la respuesta termina (AQUÍ ya tenemos userId)
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // IMPORTANTE: Capturar userId AHORA, después de authenticate
    const userId = req.userId || req.user?.id || req.user?._id?.toString() || null;
    
    const responseInfo = {
      ...initialInfo,
      userId, // Agregar userId aquí
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0,
      success: res.statusCode < 400,
    };
    
    // Determinar nivel de log según status code
    const logLevel = getLogLevel(res.statusCode);
    
    logger[logLevel](`[RESPONSE] ${req.method} ${req.path}`, responseInfo);
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
      
      // Capturar userId después de authenticate
      const userId = req.userId || req.user?.id || req.user?._id?.toString() || null;
      
      logger.error(`[ERROR] ${req.method} ${req.path}`, {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userId,
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
        const userId = req.userId || req.user?.id || req.user?._id?.toString() || null;
        
        logger.warn(`[SLOW REQUEST] ${req.method} ${req.path}`, {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl || req.url,
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
          statusCode: res.statusCode,
          ip: req.ip,
          userId,
        });
      }
    });
    
    next();
  };
};

/**
 * Middleware para registrar requests de usuarios específicos
 */
const userActivityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const userId = req.userId || req.user?.id || req.user?._id?.toString();
    
    if (!userId) {
      return;
    }
    
    const duration = Date.now() - startTime;
    
    logger.info(`[USER ACTIVITY] ${userId}`, {
      timestamp: new Date().toISOString(),
      userId,
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
    const userId = req.userId || req.user?.id || req.user?._id?.toString() || 'anonymous';
    
    logger.warn(`[SENSITIVE ACCESS] ${req.method} ${req.path}`, {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      userId,
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
 * Middleware para registrar intentos de autenticación
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
      const userId = req.userId || req.user?.id || req.user?._id?.toString() || 'anonymous';
      
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
        userId,
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
      const userId = req.userId || req.user?.id || req.user?._id?.toString() || 'anonymous';
      
      logger.info(`[EXTERNAL API] ${apiName}`, {
        timestamp: new Date().toISOString(),
        api: apiName,
        endpoint: req.path,
        userId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: res.statusCode < 400,
      });
    });
    
    next();
  };
};

/**
 * Sanitizar body para remover información sensible de los logs
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
  
  // Redactar campos sensibles
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Truncar avatar si es muy largo (base64)
  if (sanitized.avatar && typeof sanitized.avatar === 'string' && sanitized.avatar.length > 100) {
    sanitized.avatar = sanitized.avatar.substring(0, 100) + `... (${sanitized.avatar.length} chars)`;
  }
  
  return sanitized;
};

/**
 * Determinar nivel de log según status code
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
      const userId = req.userId || req.user?.id || req.user?._id?.toString() || null;
      
      const responseInfo = {
        ...requestInfo,
        userId, // Agregar userId aquí
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