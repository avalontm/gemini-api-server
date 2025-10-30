// src/middlewares/rateLimiter.js

const rateLimit = require('express-rate-limit');

/**
 * Helper para respuesta de rate limit consistente
 * @param {Object} res - Response object
 * @param {string} message - Mensaje de error
 */
const rateLimitResponse = (res, message) => {
  return res.status(429).json({
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Rate limiter general para toda la aplicacion
 * 100 requests por 15 minutos por IP
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo mas tarde',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo mas tarde'
    );
  },
  skip: (req) => {
    // No aplicar rate limit en desarrollo
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter estricto para endpoints de autenticacion
 * 5 requests por 15 minutos por IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Demasiados intentos de autenticacion, por favor intenta de nuevo mas tarde',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiados intentos de autenticacion, por favor intenta de nuevo mas tarde'
    );
  },
  skipSuccessfulRequests: true,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter para registro de usuarios
 * 3 registros por hora por IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Demasiados intentos de registro, por favor intenta de nuevo mas tarde',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiados intentos de registro, por favor intenta de nuevo mas tarde'
    );
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter para API de Gemini
 * 30 requests por minuto por usuario autenticado
 * NOTA: No usamos keyGenerator personalizado con req.ip para evitar error IPv6
 */
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Demasiadas consultas a Gemini, por favor espera un momento',
  standardHeaders: true,
  legacyHeaders: false,
  // Removido keyGenerator - express-rate-limit v8+ maneja IPs automaticamente
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiadas consultas a Gemini, por favor espera un momento'
    );
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter para upload de archivos
 * 10 uploads por 10 minutos por usuario
 */
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Demasiadas subidas de archivos, por favor espera un momento',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiadas subidas de archivos, por favor espera un momento'
    );
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter para exportacion de conversaciones
 * 5 exportaciones por 10 minutos por usuario
 */
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Demasiadas exportaciones, por favor espera un momento',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiadas exportaciones, por favor espera un momento'
    );
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter para creacion de conversaciones
 * 20 conversaciones por hora por usuario
 */
const conversationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Demasiadas conversaciones creadas, por favor espera un momento',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiadas conversaciones creadas, por favor espera un momento'
    );
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter para busquedas
 * 50 busquedas por 15 minutos
 */
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Demasiadas busquedas, por favor espera un momento',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      'Demasiadas busquedas, por favor espera un momento'
    );
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter flexible personalizable
 * @param {Object} options - Opciones de configuracion
 * @returns {Function} - Middleware de rate limiting
 */
const createCustomLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Demasiadas solicitudes',
    skipSuccessful = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return rateLimitResponse(res, message);
    },
    skipSuccessfulRequests: skipSuccessful,
    skip: (req) => {
      return process.env.NODE_ENV === 'development';
    },
  });
};

/**
 * Rate limiter basado en costo de tokens
 * Para controlar uso intensivo de API
 */
const tokenCostLimiter = (maxTokensPerWindow = 100000, windowMs = 60 * 60 * 1000) => {
  const tokenUsage = new Map();

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    // Usar IP directamente sin keyGenerator personalizado
    const key = req.ip;
    const now = Date.now();
    
    // Limpiar registros antiguos
    if (!tokenUsage.has(key)) {
      tokenUsage.set(key, { tokens: 0, resetAt: now + windowMs });
    }

    const usage = tokenUsage.get(key);

    // Resetear si expiro la ventana
    if (now > usage.resetAt) {
      usage.tokens = 0;
      usage.resetAt = now + windowMs;
    }

    // Verificar si excede el limite
    if (usage.tokens >= maxTokensPerWindow) {
      return rateLimitResponse(
        res,
        'Limite de tokens excedido, por favor espera un momento'
      );
    }

    // Adjuntar funcion para actualizar el uso de tokens
    req.addTokenUsage = (tokens) => {
      usage.tokens += tokens;
    };

    next();
  };
};

/**
 * Rate limiter adaptativo basado en la carga del servidor
 * Ajusta limites dinamicamente
 */
const adaptiveLimiter = (baseMax = 100, windowMs = 15 * 60 * 1000) => {
  let currentMax = baseMax;
  
  // Monitorear carga del servidor y ajustar
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryPercentage > 90) {
      currentMax = Math.floor(baseMax * 0.5);
    } else if (memoryPercentage > 75) {
      currentMax = Math.floor(baseMax * 0.75);
    } else {
      currentMax = baseMax;
    }
  }, 60000);

  return rateLimit({
    windowMs,
    max: (req) => currentMax,
    message: 'Servidor bajo alta carga, por favor intenta mas tarde',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return rateLimitResponse(
        res,
        'Servidor bajo alta carga, por favor intenta mas tarde'
      );
    },
    skip: (req) => {
      return process.env.NODE_ENV === 'development';
    },
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
  geminiLimiter,
  uploadLimiter,
  exportLimiter,
  conversationLimiter,
  searchLimiter,
  createCustomLimiter,
  tokenCostLimiter,
  adaptiveLimiter,
};