// src/utils/validators/fileValidator.js

const path = require('path');
const { MIME_TYPES, FILE_EXTENSIONS, FILE_SIZE_LIMITS } = require('../../config/constants');

/**
 * Validadores para archivos
 */

/**
 * Validar tipo MIME de archivo
 * @param {string} mimetype - Tipo MIME del archivo
 * @param {Array<string>} allowedTypes - Tipos permitidos
 * @returns {Object} - Resultado de validacion
 */
const validateMimeType = (mimetype, allowedTypes) => {
  const errors = [];
  
  if (!mimetype) {
    errors.push('El tipo MIME del archivo es requerido');
    return { isValid: false, errors };
  }
  
  if (!allowedTypes.includes(mimetype)) {
    errors.push(`Tipo de archivo no permitido: ${mimetype}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar extension de archivo
 * @param {string} filename - Nombre del archivo
 * @param {Array<string>} allowedExtensions - Extensiones permitidas
 * @returns {Object} - Resultado de validacion
 */
const validateFileExtension = (filename, allowedExtensions) => {
  const errors = [];
  
  if (!filename) {
    errors.push('El nombre del archivo es requerido');
    return { isValid: false, errors };
  }
  
  const ext = path.extname(filename).toLowerCase();
  
  if (!ext) {
    errors.push('El archivo debe tener una extension');
  }
  
  if (!allowedExtensions.includes(ext)) {
    errors.push(`Extension de archivo no permitida: ${ext}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    extension: ext,
  };
};

/**
 * Validar tamaño de archivo
 * @param {number} size - Tamaño del archivo en bytes
 * @param {number} maxSize - Tamaño maximo permitido
 * @returns {Object} - Resultado de validacion
 */
const validateFileSize = (size, maxSize) => {
  const errors = [];
  
  if (size === undefined || size === null) {
    errors.push('El tamaño del archivo es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof size !== 'number' || size < 0) {
    errors.push('El tamaño del archivo es invalido');
    return { isValid: false, errors };
  }
  
  if (size === 0) {
    errors.push('El archivo esta vacio');
  }
  
  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (size / (1024 * 1024)).toFixed(2);
    errors.push(`El archivo es demasiado grande (${fileSizeMB}MB). Tamaño maximo: ${maxSizeMB}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar archivo de imagen
 * @param {Object} file - Objeto de archivo
 * @returns {Object} - Resultado de validacion
 */
const validateImageFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No se proporciono ningun archivo');
    return { isValid: false, errors };
  }
  
  // Validar tipo MIME
  const mimeValidation = validateMimeType(file.mimetype, MIME_TYPES.IMAGES);
  if (!mimeValidation.isValid) {
    errors.push(...mimeValidation.errors);
  }
  
  // Validar extension
  const extValidation = validateFileExtension(file.originalname, FILE_EXTENSIONS.IMAGES);
  if (!extValidation.isValid) {
    errors.push(...extValidation.errors);
  }
  
  // Validar tamaño
  const sizeValidation = validateFileSize(file.size, FILE_SIZE_LIMITS.IMAGE);
  if (!sizeValidation.isValid) {
    errors.push(...sizeValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar archivo de audio
 * @param {Object} file - Objeto de archivo
 * @returns {Object} - Resultado de validacion
 */
const validateAudioFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No se proporciono ningun archivo');
    return { isValid: false, errors };
  }
  
  // Validar tipo MIME
  const mimeValidation = validateMimeType(file.mimetype, MIME_TYPES.AUDIO);
  if (!mimeValidation.isValid) {
    errors.push(...mimeValidation.errors);
  }
  
  // Validar extension
  const extValidation = validateFileExtension(file.originalname, FILE_EXTENSIONS.AUDIO);
  if (!extValidation.isValid) {
    errors.push(...extValidation.errors);
  }
  
  // Validar tamaño
  const sizeValidation = validateFileSize(file.size, FILE_SIZE_LIMITS.AUDIO);
  if (!sizeValidation.isValid) {
    errors.push(...sizeValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar archivo PDF
 * @param {Object} file - Objeto de archivo
 * @returns {Object} - Resultado de validacion
 */
const validatePDFFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No se proporciono ningun archivo');
    return { isValid: false, errors };
  }
  
  // Validar tipo MIME
  const mimeValidation = validateMimeType(file.mimetype, MIME_TYPES.PDF);
  if (!mimeValidation.isValid) {
    errors.push(...mimeValidation.errors);
  }
  
  // Validar extension
  const extValidation = validateFileExtension(file.originalname, FILE_EXTENSIONS.PDF);
  if (!extValidation.isValid) {
    errors.push(...extValidation.errors);
  }
  
  // Validar tamaño
  const sizeValidation = validateFileSize(file.size, FILE_SIZE_LIMITS.PDF);
  if (!sizeValidation.isValid) {
    errors.push(...sizeValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar multiples archivos de imagen
 * @param {Array<Object>} files - Array de archivos
 * @param {number} maxFiles - Numero maximo de archivos
 * @returns {Object} - Resultado de validacion
 */
const validateMultipleImages = (files, maxFiles = 5) => {
  const errors = [];
  
  if (!files || files.length === 0) {
    errors.push('No se proporcionaron archivos');
    return { isValid: false, errors };
  }
  
  if (files.length > maxFiles) {
    errors.push(`Solo se permiten hasta ${maxFiles} archivos`);
  }
  
  // Validar cada archivo individualmente
  files.forEach((file, index) => {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      errors.push(`Archivo ${index + 1}: ${validation.errors.join(', ')}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar nombre de archivo
 * @param {string} filename - Nombre del archivo
 * @returns {Object} - Resultado de validacion
 */
const validateFilename = (filename) => {
  const errors = [];
  
  if (!filename) {
    errors.push('El nombre del archivo es requerido');
    return { isValid: false, errors };
  }
  
  // Caracteres no permitidos en nombres de archivo
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  
  if (invalidChars.test(filename)) {
    errors.push('El nombre del archivo contiene caracteres no permitidos');
  }
  
  if (filename.length > 255) {
    errors.push('El nombre del archivo es demasiado largo (maximo 255 caracteres)');
  }
  
  // Sanitizar nombre de archivo
  const sanitized = filename.replace(invalidChars, '_');
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

/**
 * Obtener tipo de archivo basado en MIME type
 * @param {string} mimetype - Tipo MIME
 * @returns {string} - Tipo de archivo (image, audio, pdf, other)
 */
const getFileType = (mimetype) => {
  if (MIME_TYPES.IMAGES.includes(mimetype)) {
    return 'image';
  }
  
  if (MIME_TYPES.AUDIO.includes(mimetype)) {
    return 'audio';
  }
  
  if (MIME_TYPES.PDF.includes(mimetype)) {
    return 'pdf';
  }
  
  return 'other';
};

/**
 * Formatear tamaño de archivo a formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validar archivo generico
 * @param {Object} file - Objeto de archivo
 * @returns {Object} - Resultado de validacion
 */
const validateFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No se proporciono ningun archivo');
    return { isValid: false, errors };
  }
  
  const fileType = getFileType(file.mimetype);
  
  let validation;
  switch (fileType) {
    case 'image':
      validation = validateImageFile(file);
      break;
    case 'audio':
      validation = validateAudioFile(file);
      break;
    case 'pdf':
      validation = validatePDFFile(file);
      break;
    default:
      errors.push('Tipo de archivo no soportado');
      return { isValid: false, errors };
  }
  
  return validation;
};

module.exports = {
  validateMimeType,
  validateFileExtension,
  validateFileSize,
  validateImageFile,
  validateAudioFile,
  validatePDFFile,
  validateMultipleImages,
  validateFilename,
  validateFile,
  getFileType,
  formatFileSize,
};