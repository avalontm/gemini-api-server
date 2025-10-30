// src/config/index.js

/**
 * Exportacion centralizada de toda la configuracion
 */

const { connectDB, disconnectDB, isConnected, databaseConfig } = require('./database');
const { 
  geminiConfig, 
  initializeGeminiClient, 
  getGeminiModel, 
  validateGeminiConfig 
} = require('./gemini.config');
const {
  upload,
  uploadConfigs,
  multerConfig,
  cleanupFile,
  cleanupFiles,
  cleanupOldFiles,
  getFileInfo,
  createUploadDirs,
} = require('./multer.config');
const {
  corsConfig,
  corsConfigDevelopment,
  corsConfigProduction,
  getCorsConfig,
  corsErrorHandler,
  allowedOrigins,
} = require('./cors.config');
const {
  jwtConfig,
  jwtConfigDevelopment,
  jwtConfigProduction,
  getJwtConfig,
  validateJwtConfig,
  getExpirationMs,
} = require('./jwt.config');
const {
  swaggerConfig,
  swaggerJsDocOptions,
  validateSwaggerConfig,
} = require('./swagger.config');
const {
  USER_ROLES,
  MESSAGE_TYPES,
  MESSAGE_ROLES,
  MIME_TYPES,
  FILE_EXTENSIONS,
  FILE_SIZE_LIMITS,
  CONTENT_LIMITS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  RATE_LIMIT_CONFIG,
  PAGINATION,
  EXPORT_FORMATS,
  PROCESS_STATUS,
  THEMES,
  LANGUAGES,
  LOG_LEVELS,
  CLEANUP_CONFIG,
  SESSION_CONFIG,
} = require('./constants');

/**
 * Validar toda la configuracion
 * @returns {Object} - Resultado de validacion
 */
const validateAllConfig = () => {
  const errors = [];
  
  // Validar Gemini
  const geminiValidation = validateGeminiConfig();
  if (!geminiValidation.isValid) {
    errors.push(...geminiValidation.errors);
  }
  
  // Validar JWT
  const jwtValidation = validateJwtConfig();
  if (!jwtValidation.isValid) {
    errors.push(...jwtValidation.errors);
  }
  
  // Validar Swagger
  const swaggerValidation = validateSwaggerConfig();
  if (!swaggerValidation.isValid) {
    errors.push(...swaggerValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Mostrar configuracion en consola (sin datos sensibles)
 */
const showConfig = () => {
  console.log('\n=== CONFIGURACION DEL SERVIDOR ===');
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Puerto: ${process.env.PORT || 5000}`);
  console.log(`MongoDB URI: ${databaseConfig.uri.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`Gemini Model: ${geminiConfig.model}`);
  console.log(`JWT Expiration: ${jwtConfig.expiresIn}`);
  console.log(`Swagger Enabled: ${swaggerConfig.enabled}`);
  console.log(`Swagger Path: ${swaggerConfig.path}`);
  console.log(`CORS Origins: ${allowedOrigins.join(', ')}`);
  console.log('==================================\n');
};

module.exports = {
  // Database
  connectDB,
  disconnectDB,
  isConnected,
  databaseConfig,
  
  // Gemini
  geminiConfig,
  initializeGeminiClient,
  getGeminiModel,
  validateGeminiConfig,
  
  // Multer
  upload,
  uploadConfigs,
  multerConfig,
  cleanupFile,
  cleanupFiles,
  cleanupOldFiles,
  getFileInfo,
  createUploadDirs,
  
  // CORS
  corsConfig,
  corsConfigDevelopment,
  corsConfigProduction,
  getCorsConfig,
  corsErrorHandler,
  allowedOrigins,
  
  // JWT
  jwtConfig,
  jwtConfigDevelopment,
  jwtConfigProduction,
  getJwtConfig,
  validateJwtConfig,
  getExpirationMs,
  
  // Swagger
  swaggerConfig,
  swaggerJsDocOptions,
  validateSwaggerConfig,
  
  // Constants
  USER_ROLES,
  MESSAGE_TYPES,
  MESSAGE_ROLES,
  MIME_TYPES,
  FILE_EXTENSIONS,
  FILE_SIZE_LIMITS,
  CONTENT_LIMITS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  RATE_LIMIT_CONFIG,
  PAGINATION,
  EXPORT_FORMATS,
  PROCESS_STATUS,
  THEMES,
  LANGUAGES,
  LOG_LEVELS,
  CLEANUP_CONFIG,
  SESSION_CONFIG,
  
  // Utilities
  validateAllConfig,
  showConfig,
};