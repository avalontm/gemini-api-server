// src/config/constants.js

/**
 * Constantes globales de la aplicacion
 */

// Roles de usuario
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
};

// Tipos de mensaje
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VOICE: 'voice',
  MULTIMODAL: 'multimodal',
  PDF: 'pdf',
};

// Roles de mensaje en conversacion
const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

// Tipos MIME permitidos
const MIME_TYPES = {
  IMAGES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
  AUDIO: [
    'audio/wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/webm',
    'audio/ogg',
  ],
  PDF: [
    'application/pdf',
  ],
};

// Extensiones de archivo permitidas
const FILE_EXTENSIONS = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  AUDIO: ['.wav', '.mp3', '.mpeg', '.webm', '.ogg'],
  PDF: ['.pdf'],
};

// Limites de tamaño de archivo (en bytes)
const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  AUDIO: 25 * 1024 * 1024, // 25MB
  PDF: 10 * 1024 * 1024, // 10MB
  GENERAL: 10 * 1024 * 1024, // 10MB
};

// Limites de contenido
const CONTENT_LIMITS = {
  TEXT_MIN_LENGTH: 1,
  TEXT_MAX_LENGTH: 30000,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_MAX_LENGTH: 255,
  CONVERSATION_TITLE_MIN_LENGTH: 1,
  CONVERSATION_TITLE_MAX_LENGTH: 200,
  MAX_TAGS_PER_CONVERSATION: 10,
  TAG_MAX_LENGTH: 50,
  MAX_MESSAGES_PER_CONVERSATION: 100,
  MAX_ATTACHMENTS_PER_MESSAGE: 5,
};

// Codigos de estado HTTP
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Mensajes de error comunes
const ERROR_MESSAGES = {
  // Autenticacion
  INVALID_CREDENTIALS: 'Credenciales invalidas',
  UNAUTHORIZED: 'No autorizado',
  TOKEN_EXPIRED: 'Token expirado',
  TOKEN_INVALID: 'Token invalido',
  TOKEN_MISSING: 'Token no proporcionado',
  
  // Usuarios
  USER_NOT_FOUND: 'Usuario no encontrado',
  USER_ALREADY_EXISTS: 'El usuario ya existe',
  EMAIL_ALREADY_EXISTS: 'El email ya esta registrado',
  
  // Validacion
  VALIDATION_ERROR: 'Error de validacion',
  REQUIRED_FIELD: 'Campo requerido',
  INVALID_FORMAT: 'Formato invalido',
  
  // Archivos
  FILE_TOO_LARGE: 'Archivo demasiado grande',
  FILE_TYPE_NOT_ALLOWED: 'Tipo de archivo no permitido',
  FILE_UPLOAD_ERROR: 'Error al subir archivo',
  
  // Conversaciones
  CONVERSATION_NOT_FOUND: 'Conversacion no encontrada',
  MESSAGE_NOT_FOUND: 'Mensaje no encontrado',
  
  // Gemini API
  GEMINI_API_ERROR: 'Error en la API de Gemini',
  GEMINI_RESPONSE_ERROR: 'Error al obtener respuesta de Gemini',
  
  // Genericos
  INTERNAL_ERROR: 'Error interno del servidor',
  NOT_FOUND: 'Recurso no encontrado',
  BAD_REQUEST: 'Solicitud incorrecta',
  RATE_LIMIT_EXCEEDED: 'Limite de solicitudes excedido',
};

// Mensajes de exito comunes
const SUCCESS_MESSAGES = {
  // Autenticacion
  LOGIN_SUCCESS: 'Inicio de sesion exitoso',
  LOGOUT_SUCCESS: 'Cierre de sesion exitoso',
  REGISTER_SUCCESS: 'Registro exitoso',
  
  // Usuarios
  USER_UPDATED: 'Usuario actualizado correctamente',
  PASSWORD_UPDATED: 'Contraseña actualizada correctamente',
  
  // Conversaciones
  CONVERSATION_CREATED: 'Conversacion creada correctamente',
  CONVERSATION_UPDATED: 'Conversacion actualizada correctamente',
  CONVERSATION_DELETED: 'Conversacion eliminada correctamente',
  MESSAGE_CREATED: 'Mensaje creado correctamente',
  
  // Gemini
  RESPONSE_GENERATED: 'Respuesta generada correctamente',
  
  // Genericos
  OPERATION_SUCCESS: 'Operacion exitosa',
};

// Expresiones regulares
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  URL: /^https?:\/\/.+/,
};

// Configuracion de rate limiting
const RATE_LIMIT_CONFIG = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Rate limiting especifico por endpoint
  AUTH: {
    WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
  },
  
  GEMINI: {
    WINDOW_MS: 60 * 1000, // 1 minuto
    MAX_REQUESTS: 20,
  },
};

// Configuracion de paginacion
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Formatos de exportacion
const EXPORT_FORMATS = {
  PDF: 'pdf',
  TXT: 'txt',
  JSON: 'json',
};

// Estados de proceso
const PROCESS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Temas de interfaz
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// Idiomas soportados
const LANGUAGES = {
  ES: 'es',
  EN: 'en',
  FR: 'fr',
  DE: 'de',
  PT: 'pt',
};

// Niveles de log
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
};

// Tiempo de limpieza de archivos temporales
const CLEANUP_CONFIG = {
  INTERVAL_HOURS: parseInt(process.env.TEMP_FILE_CLEANUP_HOURS) || 24,
  RUN_ON_STARTUP: true,
};

// Timeout de sesion
const SESSION_CONFIG = {
  TIMEOUT_MINUTES: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 60,
  EXTEND_ON_ACTIVITY: true,
};

module.exports = {
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
};