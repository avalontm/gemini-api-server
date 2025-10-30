// src/utils/validators/textValidator.js

const { CONTENT_LIMITS } = require('../../config/constants');

/**
 * Validadores para texto
 */

/**
 * Validar longitud de texto
 * @param {string} text - Texto a validar
 * @param {number} minLength - Longitud minima
 * @param {number} maxLength - Longitud maxima
 * @returns {Object} - Resultado de validacion
 */
const validateTextLength = (text, minLength = 1, maxLength = 30000) => {
  const errors = [];
  
  if (!text) {
    errors.push('El texto es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof text !== 'string') {
    errors.push('El texto debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length < minLength) {
    errors.push(`El texto debe tener al menos ${minLength} caracteres`);
  }
  
  if (trimmedText.length > maxLength) {
    errors.push(`El texto no puede exceder ${maxLength} caracteres`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    length: trimmedText.length,
  };
};

/**
 * Validar prompt de texto para Gemini
 * @param {string} prompt - Prompt a validar
 * @returns {Object} - Resultado de validacion
 */
const validatePrompt = (prompt) => {
  const errors = [];
  
  if (!prompt) {
    errors.push('El prompt es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof prompt !== 'string') {
    errors.push('El prompt debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedPrompt = prompt.trim();
  
  if (trimmedPrompt.length === 0) {
    errors.push('El prompt no puede estar vacio');
  }
  
  if (trimmedPrompt.length < CONTENT_LIMITS.TEXT_MIN_LENGTH) {
    errors.push(`El prompt debe tener al menos ${CONTENT_LIMITS.TEXT_MIN_LENGTH} caracter`);
  }
  
  if (trimmedPrompt.length > CONTENT_LIMITS.TEXT_MAX_LENGTH) {
    errors.push(`El prompt no puede exceder ${CONTENT_LIMITS.TEXT_MAX_LENGTH} caracteres`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedPrompt,
    length: trimmedPrompt.length,
  };
};

/**
 * Validar titulo de conversacion
 * @param {string} title - Titulo a validar
 * @returns {Object} - Resultado de validacion
 */
const validateConversationTitle = (title) => {
  const errors = [];
  
  if (!title) {
    errors.push('El titulo es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof title !== 'string') {
    errors.push('El titulo debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedTitle = title.trim();
  
  if (trimmedTitle.length < CONTENT_LIMITS.CONVERSATION_TITLE_MIN_LENGTH) {
    errors.push(`El titulo debe tener al menos ${CONTENT_LIMITS.CONVERSATION_TITLE_MIN_LENGTH} caracter`);
  }
  
  if (trimmedTitle.length > CONTENT_LIMITS.CONVERSATION_TITLE_MAX_LENGTH) {
    errors.push(`El titulo no puede exceder ${CONTENT_LIMITS.CONVERSATION_TITLE_MAX_LENGTH} caracteres`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedTitle,
  };
};

/**
 * Validar tag
 * @param {string} tag - Tag a validar
 * @returns {Object} - Resultado de validacion
 */
const validateTag = (tag) => {
  const errors = [];
  
  if (!tag) {
    errors.push('El tag es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof tag !== 'string') {
    errors.push('El tag debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedTag = tag.trim().toLowerCase();
  
  if (trimmedTag.length === 0) {
    errors.push('El tag no puede estar vacio');
  }
  
  if (trimmedTag.length > CONTENT_LIMITS.TAG_MAX_LENGTH) {
    errors.push(`El tag no puede exceder ${CONTENT_LIMITS.TAG_MAX_LENGTH} caracteres`);
  }
  
  // Validar que solo contenga caracteres alfanumericos, guiones y espacios
  const validTagRegex = /^[a-z0-9\s-]+$/;
  if (!validTagRegex.test(trimmedTag)) {
    errors.push('El tag solo puede contener letras, numeros, espacios y guiones');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedTag,
  };
};

/**
 * Validar array de tags
 * @param {Array<string>} tags - Tags a validar
 * @returns {Object} - Resultado de validacion
 */
const validateTags = (tags) => {
  const errors = [];
  const sanitized = [];
  
  if (!tags) {
    return {
      isValid: true,
      errors: [],
      sanitized: [],
    };
  }
  
  if (!Array.isArray(tags)) {
    errors.push('Los tags deben ser un array');
    return { isValid: false, errors };
  }
  
  if (tags.length > CONTENT_LIMITS.MAX_TAGS_PER_CONVERSATION) {
    errors.push(`No se pueden tener mas de ${CONTENT_LIMITS.MAX_TAGS_PER_CONVERSATION} tags`);
  }
  
  // Validar cada tag individualmente
  tags.forEach((tag, index) => {
    const validation = validateTag(tag);
    if (!validation.isValid) {
      errors.push(`Tag ${index + 1}: ${validation.errors.join(', ')}`);
    } else {
      // Evitar tags duplicados
      if (!sanitized.includes(validation.sanitized)) {
        sanitized.push(validation.sanitized);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

/**
 * Sanitizar texto eliminando caracteres peligrosos
 * @param {string} text - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Eliminar caracteres de control
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Eliminar multiples espacios en blanco
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Trim
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Validar y sanitizar contenido de mensaje
 * @param {string} content - Contenido del mensaje
 * @returns {Object} - Resultado de validacion
 */
const validateMessageContent = (content) => {
  const errors = [];
  
  if (!content) {
    errors.push('El contenido del mensaje es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof content !== 'string') {
    errors.push('El contenido debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeText(content);
  
  if (sanitized.length === 0) {
    errors.push('El contenido no puede estar vacio');
  }
  
  if (sanitized.length > CONTENT_LIMITS.TEXT_MAX_LENGTH) {
    errors.push(`El contenido no puede exceder ${CONTENT_LIMITS.TEXT_MAX_LENGTH} caracteres`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
    length: sanitized.length,
  };
};

/**
 * Validar busqueda de texto
 * @param {string} query - Query de busqueda
 * @returns {Object} - Resultado de validacion
 */
const validateSearchQuery = (query) => {
  const errors = [];
  
  if (!query) {
    errors.push('La busqueda no puede estar vacia');
    return { isValid: false, errors };
  }
  
  if (typeof query !== 'string') {
    errors.push('La busqueda debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedQuery = query.trim();
  
  if (trimmedQuery.length === 0) {
    errors.push('La busqueda no puede estar vacia');
  }
  
  if (trimmedQuery.length > 200) {
    errors.push('La busqueda no puede exceder 200 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedQuery,
  };
};

/**
 * Contar palabras en un texto
 * @param {string} text - Texto
 * @returns {number} - Numero de palabras
 */
const countWords = (text) => {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  
  return trimmed.split(/\s+/).length;
};

/**
 * Truncar texto a un numero maximo de caracteres
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud maxima
 * @param {string} suffix - Sufijo a agregar (por defecto '...')
 * @returns {string} - Texto truncado
 */
const truncateText = (text, maxLength, suffix = '...') => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Detectar idioma del texto (simple)
 * @param {string} text - Texto
 * @returns {string} - Codigo de idioma detectado
 */
const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') {
    return 'unknown';
  }
  
  // Deteccion simple basada en caracteres comunes
  const spanishChars = /[áéíóúñü]/i;
  const englishChars = /\b(the|is|are|and|or|but|in|on|at|to|for)\b/i;
  
  if (spanishChars.test(text)) {
    return 'es';
  }
  
  if (englishChars.test(text)) {
    return 'en';
  }
  
  return 'unknown';
};

module.exports = {
  validateTextLength,
  validatePrompt,
  validateConversationTitle,
  validateTag,
  validateTags,
  validateMessageContent,
  validateSearchQuery,
  sanitizeText,
  countWords,
  truncateText,
  detectLanguage,
};