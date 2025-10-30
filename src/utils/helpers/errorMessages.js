// src/utils/helpers/errorMessages.js

/**
 * Mensajes de error centralizados para toda la aplicacion
 */

const errorMessages = {
  // Errores de autenticacion
  auth: {
    INVALID_CREDENTIALS: 'Credenciales invalidas',
    USER_NOT_FOUND: 'Usuario no encontrado',
    USER_ALREADY_EXISTS: 'El usuario ya existe',
    EMAIL_ALREADY_EXISTS: 'El email ya esta registrado',
    USERNAME_ALREADY_EXISTS: 'El nombre de usuario ya esta en uso',
    INVALID_TOKEN: 'Token invalido o expirado',
    TOKEN_EXPIRED: 'El token ha expirado',
    TOKEN_MISSING: 'Token no proporcionado',
    UNAUTHORIZED: 'No autorizado para realizar esta accion',
    SESSION_EXPIRED: 'La sesion ha expirado',
    INVALID_PASSWORD: 'Contrasena incorrecta',
    WEAK_PASSWORD: 'La contrasena no cumple con los requisitos minimos',
    LOGOUT_FAILED: 'Error al cerrar sesion',
  },

  // Errores de validacion
  validation: {
    REQUIRED_FIELD: 'Este campo es requerido',
    INVALID_EMAIL: 'Email invalido',
    INVALID_FORMAT: 'Formato invalido',
    MIN_LENGTH: 'Longitud minima no alcanzada',
    MAX_LENGTH: 'Longitud maxima excedida',
    INVALID_TYPE: 'Tipo de dato invalido',
    INVALID_VALUE: 'Valor invalido',
    OUT_OF_RANGE: 'Valor fuera de rango',
    INVALID_DATE: 'Fecha invalida',
    INVALID_URL: 'URL invalida',
    INVALID_PHONE: 'Numero de telefono invalido',
  },

  // Errores de archivos
  file: {
    FILE_TOO_LARGE: 'El archivo es demasiado grande',
    INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
    FILE_NOT_FOUND: 'Archivo no encontrado',
    UPLOAD_FAILED: 'Error al subir el archivo',
    FILE_CORRUPTED: 'El archivo esta corrupto',
    NO_FILE_PROVIDED: 'No se proporciono ningun archivo',
    MULTIPLE_FILES_NOT_ALLOWED: 'No se permiten multiples archivos',
    FILE_PROCESSING_FAILED: 'Error al procesar el archivo',
    INVALID_IMAGE: 'Imagen invalida',
    INVALID_AUDIO: 'Archivo de audio invalido',
    INVALID_PDF: 'Archivo PDF invalido',
  },

  // Errores de Gemini API
  gemini: {
    API_KEY_MISSING: 'API Key de Gemini no configurada',
    API_KEY_INVALID: 'API Key de Gemini invalida',
    API_ERROR: 'Error en la API de Gemini',
    RATE_LIMIT_EXCEEDED: 'Limite de peticiones excedido',
    MODEL_NOT_FOUND: 'Modelo no encontrado',
    GENERATION_FAILED: 'Error al generar respuesta',
    INVALID_PROMPT: 'Prompt invalido',
    PROMPT_TOO_LONG: 'El prompt es demasiado largo',
    CONTENT_BLOCKED: 'Contenido bloqueado por politicas de seguridad',
    UNSUPPORTED_FEATURE: 'Caracteristica no soportada',
    TIMEOUT: 'Tiempo de espera agotado',
  },

  // Errores de base de datos
  database: {
    CONNECTION_FAILED: 'Error al conectar con la base de datos',
    QUERY_FAILED: 'Error al ejecutar consulta',
    NOT_FOUND: 'Registro no encontrado',
    DUPLICATE_KEY: 'Registro duplicado',
    VALIDATION_ERROR: 'Error de validacion en base de datos',
    TRANSACTION_FAILED: 'Error en la transaccion',
    UPDATE_FAILED: 'Error al actualizar registro',
    DELETE_FAILED: 'Error al eliminar registro',
    CREATE_FAILED: 'Error al crear registro',
  },

  // Errores de conversaciones
  conversation: {
    NOT_FOUND: 'Conversacion no encontrada',
    ACCESS_DENIED: 'No tienes acceso a esta conversacion',
    CREATE_FAILED: 'Error al crear conversacion',
    UPDATE_FAILED: 'Error al actualizar conversacion',
    DELETE_FAILED: 'Error al eliminar conversacion',
    EMPTY_CONVERSATION: 'La conversacion esta vacia',
    MAX_CONVERSATIONS_REACHED: 'Limite de conversaciones alcanzado',
  },

  // Errores de mensajes
  message: {
    NOT_FOUND: 'Mensaje no encontrado',
    CREATE_FAILED: 'Error al crear mensaje',
    DELETE_FAILED: 'Error al eliminar mensaje',
    EMPTY_MESSAGE: 'El mensaje no puede estar vacio',
    MESSAGE_TOO_LONG: 'El mensaje es demasiado largo',
  },

  // Errores de usuario
  user: {
    NOT_FOUND: 'Usuario no encontrado',
    UPDATE_FAILED: 'Error al actualizar usuario',
    DELETE_FAILED: 'Error al eliminar usuario',
    PROFILE_INCOMPLETE: 'Perfil incompleto',
    INVALID_ROLE: 'Rol invalido',
  },

  // Errores de permisos
  permission: {
    FORBIDDEN: 'No tienes permisos para realizar esta accion',
    INSUFFICIENT_PRIVILEGES: 'Privilegios insuficientes',
    ADMIN_REQUIRED: 'Se requieren privilegios de administrador',
    OWNER_REQUIRED: 'Solo el propietario puede realizar esta accion',
  },

  // Errores de servidor
  server: {
    INTERNAL_ERROR: 'Error interno del servidor',
    SERVICE_UNAVAILABLE: 'Servicio no disponible',
    MAINTENANCE_MODE: 'El servidor esta en mantenimiento',
    TIMEOUT: 'Tiempo de espera agotado',
    TOO_MANY_REQUESTS: 'Demasiadas solicitudes',
  },

  // Errores de red
  network: {
    CONNECTION_ERROR: 'Error de conexion',
    TIMEOUT: 'Tiempo de espera agotado',
    DNS_ERROR: 'Error de resolucion DNS',
    NETWORK_UNREACHABLE: 'Red no accesible',
  },

  // Errores de exportacion
  export: {
    EXPORT_FAILED: 'Error al exportar',
    INVALID_FORMAT: 'Formato de exportacion invalido',
    NO_DATA_TO_EXPORT: 'No hay datos para exportar',
    PDF_GENERATION_FAILED: 'Error al generar PDF',
    TXT_GENERATION_FAILED: 'Error al generar archivo de texto',
  },

  // Errores generales
  general: {
    UNKNOWN_ERROR: 'Error desconocido',
    BAD_REQUEST: 'Solicitud incorrecta',
    NOT_IMPLEMENTED: 'Funcionalidad no implementada',
    DEPRECATED: 'Esta funcionalidad esta obsoleta',
  },
};

/**
 * Obtener mensaje de error por categoria y codigo
 * @param {string} category - Categoria del error
 * @param {string} code - Codigo del error
 * @returns {string} - Mensaje de error
 */
const getErrorMessage = (category, code) => {
  if (errorMessages[category] && errorMessages[category][code]) {
    return errorMessages[category][code];
  }
  return errorMessages.general.UNKNOWN_ERROR;
};

/**
 * Crear objeto de error con detalles
 * @param {string} category - Categoria del error
 * @param {string} code - Codigo del error
 * @param {Object} details - Detalles adicionales
 * @returns {Object} - Objeto de error
 */
const createError = (category, code, details = {}) => {
  return {
    category,
    code,
    message: getErrorMessage(category, code),
    details,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Crear error de validacion con campos
 * @param {Array} fields - Array de campos con errores
 * @returns {Object} - Objeto de error de validacion
 */
const createValidationError = (fields) => {
  return {
    category: 'validation',
    code: 'VALIDATION_ERROR',
    message: 'Error de validacion',
    fields,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Formatear error de Mongoose a formato estandar
 * @param {Object} mongooseError - Error de Mongoose
 * @returns {Object} - Error formateado
 */
const formatMongooseError = (mongooseError) => {
  if (mongooseError.name === 'ValidationError') {
    const fields = Object.keys(mongooseError.errors).map(key => ({
      field: key,
      message: mongooseError.errors[key].message,
    }));
    return createValidationError(fields);
  }

  if (mongooseError.code === 11000) {
    const field = Object.keys(mongooseError.keyPattern)[0];
    return createError('database', 'DUPLICATE_KEY', { field });
  }

  return createError('database', 'QUERY_FAILED', {
    name: mongooseError.name,
    message: mongooseError.message,
  });
};

/**
 * Formatear error de express-validator
 * @param {Array} validationErrors - Errores de express-validator
 * @returns {Object} - Error formateado
 */
const formatExpressValidatorError = (validationErrors) => {
  const fields = validationErrors.map(error => ({
    field: error.param || error.path,
    message: error.msg,
    value: error.value,
  }));
  return createValidationError(fields);
};

module.exports = {
  errorMessages,
  getErrorMessage,
  createError,
  createValidationError,
  formatMongooseError,
  formatExpressValidatorError,
};