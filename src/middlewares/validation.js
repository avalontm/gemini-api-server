// src/middlewares/validation.js

const { body, param, query, validationResult } = require('express-validator');
const { validationErrorResponse } = require('../utils/helpers/responseFormatter');
const { CARRERAS } = require('../config/constants');

/**
 * Middleware para validar resultados de express-validator
 * Debe usarse despues de las reglas de validacion
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));
    
    return validationErrorResponse(res, formattedErrors);
  }
  
  next();
};

/**
 * Reglas de validacion para registro de usuario del TecNM
 */
const registerValidation = [
  body('numeroControl')
    .trim()
    .notEmpty().withMessage('El numero de control es requerido')
    .matches(/^\d{8}$/).withMessage('El numero de control debe tener 8 digitos'),
  
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  
  body('nombreCompleto')
    .trim()
    .notEmpty().withMessage('El nombre completo es requerido')
    .isLength({ min: 3, max: 100 }).withMessage('El nombre completo debe tener entre 3 y 100 caracteres'),
  
  body('carrera')
    .trim()
    .notEmpty().withMessage('La carrera es requerida')
    .isIn(Object.values(CARRERAS)).withMessage('Carrera no valida'),
  
  body('semestre')
    .notEmpty().withMessage('El semestre es requerido')
    .isInt({ min: 1, max: 12 }).withMessage('El semestre debe estar entre 1 y 12')
    .toInt(),
  
  body('telefono')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('El telefono debe tener 10 digitos'),
  
  body('avatar')
    .optional()
    .custom((value) => {
      if (value && !value.startsWith('data:image/')) {
        throw new Error('El avatar debe ser una imagen en formato base64');
      }
      return true;
    }),
  
  validate,
];

/**
 * Reglas de validacion para login
 * Actualizado para aceptar numeroControl o email
 */
const loginValidation = [
  body('numeroControl')
    .optional()
    .trim()
    .matches(/^\d{8}$/).withMessage('El numero de control debe tener 8 digitos'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email invalido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('La contraseña es requerida'),
  
  validate,
];

/**
 * Reglas de validacion para actualizacion de perfil del TecNM
 */
const updateProfileValidation = [
  body('nombreCompleto')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('El nombre completo debe tener entre 3 y 100 caracteres'),
  
  body('carrera')
    .optional()
    .trim()
    .isIn(Object.values(CARRERAS)).withMessage('Carrera no valida'),
  
  body('semestre')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('El semestre debe estar entre 1 y 12')
    .toInt(),
  
  body('telefono')
    .optional()
    .trim()
    .custom((value) => {
      if (value === null || value === '') return true;
      if (!/^[0-9]{10}$/.test(value)) {
        throw new Error('El telefono debe tener 10 digitos');
      }
      return true;
    }),
  
  body('avatar')
    .optional()
    .custom((value) => {
      if (value === null) return true;
      if (value && !value.startsWith('data:image/')) {
        throw new Error('El avatar debe ser una imagen en formato base64');
      }
      return true;
    }),
  
  body('numeroControl')
    .optional()
    .custom((value) => {
      throw new Error('No se puede modificar el numero de control');
    }),
  
  body('email')
    .optional()
    .custom((value) => {
      throw new Error('No se puede modificar el email');
    }),
  
  validate,
];

/**
 * Reglas de validacion para cambio de contraseña
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('La contraseña actual es requerida'),
  
  body('newPassword')
    .notEmpty().withMessage('La nueva contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),
  
  validate,
];

/**
 * Reglas de validacion para consulta de texto a Gemini
 */
const textQueryValidation = [
  body('prompt')
    .trim()
    .notEmpty().withMessage('El prompt es requerido')
    .isLength({ min: 1, max: 10000 }).withMessage('El prompt debe tener entre 1 y 10000 caracteres'),
  
  body('conversationId')
    .optional()
    .trim()
    .isMongoId().withMessage('ID de conversacion invalido'),
  
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 }).withMessage('La temperatura debe estar entre 0 y 2'),
  
  body('maxTokens')
    .optional()
    .isInt({ min: 1, max: 8192 }).withMessage('maxTokens debe estar entre 1 y 8192'),
  
  validate,
];

/**
 * Reglas de validacion para ID de MongoDB
 */
const mongoIdValidation = [
  param('id')
    .trim()
    .isMongoId().withMessage('ID invalido'),
  
  validate,
];

/**
 * Reglas de validacion para conversacion ID
 */
const conversationIdValidation = [
  param('conversationId')
    .trim()
    .isMongoId().withMessage('ID de conversacion invalido'),
  
  validate,
];

/**
 * Reglas de validacion para crear conversacion
 */
const createConversationValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('El titulo debe tener entre 1 y 100 caracteres'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags debe ser un array')
    .custom((tags) => {
      if (tags.some(tag => typeof tag !== 'string')) {
        throw new Error('Todos los tags deben ser strings');
      }
      return true;
    }),
  
  validate,
];

/**
 * Reglas de validacion para actualizar conversacion
 */
const updateConversationValidation = [
  param('id')
    .trim()
    .isMongoId().withMessage('ID de conversacion invalido'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('El titulo debe tener entre 1 y 100 caracteres'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags debe ser un array')
    .custom((tags) => {
      if (tags.some(tag => typeof tag !== 'string')) {
        throw new Error('Todos los tags deben ser strings');
      }
      return true;
    }),
  
  validate,
];

/**
 * Reglas de validacion para paginacion
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page debe ser un entero mayor a 0')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit debe estar entre 1 y 100')
    .toInt(),
  
  validate,
];

/**
 * Reglas de validacion para busqueda
 */
const searchValidation = [
  query('q')
    .trim()
    .notEmpty().withMessage('El termino de busqueda es requerido')
    .isLength({ min: 1, max: 100 }).withMessage('El termino debe tener entre 1 y 100 caracteres'),
  
  validate,
];

/**
 * Reglas de validacion para exportar conversacion
 */
const exportConversationValidation = [
  param('conversationId')
    .trim()
    .isMongoId().withMessage('ID de conversacion invalido'),
  
  query('format')
    .optional()
    .isIn(['pdf', 'txt', 'json']).withMessage('Formato debe ser pdf, txt o json'),
  
  validate,
];

/**
 * Reglas de validacion para analisis de imagen
 */
const imageAnalysisValidation = [
  body('prompt')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('El prompt no debe exceder 5000 caracteres'),
  
  body('conversationId')
    .optional()
    .trim()
    .isMongoId().withMessage('ID de conversacion invalido'),
  
  validate,
];

/**
 * Reglas de validacion para consulta multimodal
 */
const multimodalValidation = [
  body('prompt')
    .trim()
    .notEmpty().withMessage('El prompt es requerido')
    .isLength({ min: 1, max: 10000 }).withMessage('El prompt debe tener entre 1 y 10000 caracteres'),
  
  body('conversationId')
    .optional()
    .trim()
    .isMongoId().withMessage('ID de conversacion invalido'),
  
  body('type')
    .optional()
    .isIn(['text', 'image', 'audio', 'mixed']).withMessage('Tipo invalido'),
  
  validate,
];

/**
 * Middleware personalizado para validar tipos MIME de archivos
 */
const validateFileMimeType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    const fileType = req.file.mimetype;
    
    if (!allowedTypes.includes(fileType)) {
      return validationErrorResponse(res, [
        {
          field: 'file',
          message: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`,
        },
      ]);
    }
    
    next();
  };
};

/**
 * Middleware para validar tamaño de archivo
 */
const validateFileSize = (maxSizeBytes) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    if (req.file.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
      return validationErrorResponse(res, [
        {
          field: 'file',
          message: `El archivo excede el tamaño maximo de ${maxSizeMB}MB`,
        },
      ]);
    }
    
    next();
  };
};

/**
 * Middleware para sanitizar inputs
 */
const sanitizeInputs = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  textQueryValidation,
  mongoIdValidation,
  conversationIdValidation,
  createConversationValidation,
  updateConversationValidation,
  paginationValidation,
  searchValidation,
  exportConversationValidation,
  imageAnalysisValidation,
  multimodalValidation,
  validateFileMimeType,
  validateFileSize,
  sanitizeInputs,
};