// src/middlewares/errorHandler.js

const { errorResponse, internalErrorResponse } = require('../utils/helpers/responseFormatter');
const { formatMongooseError } = require('../utils/helpers/errorMessages');
const logger = require('../utils/logger');

/**
 * Middleware de manejo global de errores
 * Debe ser el ultimo middleware registrado en la aplicacion
 */
const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error('Error capturado por errorHandler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId || 'no autenticado',
  });

  // Error de Mongoose - Validacion
  if (err.name === 'ValidationError') {
    const formattedError = formatMongooseError(err);
    return errorResponse(
      res,
      400,
      'Error de validacion',
      formattedError.fields
    );
  }

  // Error de Mongoose - Cast (ID invalido)
  if (err.name === 'CastError') {
    return errorResponse(
      res,
      400,
      'ID invalido',
      [{ field: err.path, message: 'Formato de ID invalido' }]
    );
  }

  // Error de Mongoose - Duplicado (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(
      res,
      409,
      'Registro duplicado',
      [{ field, message: `El ${field} ya existe` }]
    );
  }

  // Error de JWT - Token invalido
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(
      res,
      401,
      'Token invalido'
    );
  }

  // Error de JWT - Token expirado
  if (err.name === 'TokenExpiredError') {
    return errorResponse(
      res,
      401,
      'Token expirado'
    );
  }

  // Error de Multer - Archivo demasiado grande
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(
      res,
      400,
      'El archivo es demasiado grande',
      [{ 
        field: 'file', 
        message: `Tamaño maximo permitido: ${process.env.MAX_FILE_SIZE || '10MB'}` 
      }]
    );
  }

  // Error de Multer - Tipo de archivo no permitido
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return errorResponse(
      res,
      400,
      'Tipo de archivo no permitido'
    );
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(
      res,
      400,
      'JSON invalido en el body de la peticion'
    );
  }

  // Errores personalizados con statusCode
  if (err.statusCode) {
    return errorResponse(
      res,
      err.statusCode,
      err.message,
      err.errors || null
    );
  }

  // Errores de validacion de express-validator
  if (err.errors && Array.isArray(err.errors)) {
    return errorResponse(
      res,
      400,
      'Error de validacion',
      err.errors
    );
  }

  // Error generico del servidor
  return internalErrorResponse(
    res,
    'Error interno del servidor',
    process.env.NODE_ENV === 'development' ? err : null
  );
};

/**
 * Middleware para manejar rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Clase de error personalizado
 */
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Crear error personalizado de validacion
 */
const createValidationError = (message, fields) => {
  return new AppError(message, 400, fields);
};

/**
 * Crear error personalizado de autenticacion
 */
const createAuthError = (message = 'No autorizado') => {
  return new AppError(message, 401);
};

/**
 * Crear error personalizado de permisos
 */
const createForbiddenError = (message = 'Acceso prohibido') => {
  return new AppError(message, 403);
};

/**
 * Crear error personalizado de no encontrado
 */
const createNotFoundError = (message = 'Recurso no encontrado') => {
  return new AppError(message, 404);
};

/**
 * Crear error personalizado de conflicto
 */
const createConflictError = (message = 'Conflicto') => {
  return new AppError(message, 409);
};

/**
 * Crear error personalizado de servidor
 */
const createServerError = (message = 'Error interno del servidor') => {
  return new AppError(message, 500);
};

/**
 * Wrapper para funciones async que automaticamente captura errores
 * Alternativa al asyncHandler separado
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validar si un error es operacional (esperado)
 */
const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Handler para errores no capturados en promesas
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
      reason,
      promise,
    });
    
    // En produccion, considerar cerrar el servidor gracefully
    if (process.env.NODE_ENV === 'production') {
      console.error('Unhandled Rejection. Shutting down...');
      process.exit(1);
    }
  });
};

/**
 * Handler para excepciones no capturadas
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
    });
    
    console.error('Uncaught Exception. Shutting down...');
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError,
  createValidationError,
  createAuthError,
  createForbiddenError,
  createNotFoundError,
  createConflictError,
  createServerError,
  catchAsync,
  isOperationalError,
  handleUnhandledRejection,
  handleUncaughtException,
};