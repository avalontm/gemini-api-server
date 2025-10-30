// src/utils/helpers/responseFormatter.js

/**
 * Helpers para formatear respuestas HTTP de manera consistente
 */

/**
 * Formatear respuesta exitosa
 * @param {Object} res - Objeto response de Express
 * @param {number} statusCode - Codigo de estado HTTP
 * @param {string} message - Mensaje de exito
 * @param {*} data - Datos a devolver
 * @returns {Object} - Respuesta formateada
 */
const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Formatear respuesta de error
 * @param {Object} res - Objeto response de Express
 * @param {number} statusCode - Codigo de estado HTTP
 * @param {string} message - Mensaje de error
 * @param {Array|Object} errors - Errores detallados
 * @returns {Object} - Respuesta formateada
 */
const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Formatear respuesta con paginacion
 * @param {Object} res - Objeto response de Express
 * @param {number} statusCode - Codigo de estado HTTP
 * @param {string} message - Mensaje
 * @param {Array} data - Datos paginados
 * @param {Object} pagination - Informacion de paginacion
 * @returns {Object} - Respuesta formateada
 */
const paginatedResponse = (res, statusCode, message, data, pagination) => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

/**
 * Formatear respuesta de creacion exitosa
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de exito
 * @param {*} data - Datos creados
 * @returns {Object} - Respuesta formateada
 */
const createdResponse = (res, message, data) => {
  return successResponse(res, 201, message, data);
};

/**
 * Formatear respuesta de actualizacion exitosa
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de exito
 * @param {*} data - Datos actualizados
 * @returns {Object} - Respuesta formateada
 */
const updatedResponse = (res, message, data = null) => {
  return successResponse(res, 200, message, data);
};

/**
 * Formatear respuesta de eliminacion exitosa
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de exito
 * @returns {Object} - Respuesta formateada
 */
const deletedResponse = (res, message) => {
  return successResponse(res, 200, message);
};

/**
 * Formatear respuesta sin contenido
 * @param {Object} res - Objeto response de Express
 * @returns {Object} - Respuesta sin contenido
 */
const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Formatear respuesta de error de validacion
 * @param {Object} res - Objeto response de Express
 * @param {Array|Object} errors - Errores de validacion
 * @returns {Object} - Respuesta formateada
 */
const validationErrorResponse = (res, errors) => {
  return errorResponse(res, 400, 'Error de validacion', errors);
};

/**
 * Formatear respuesta de no autorizado
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} - Respuesta formateada
 */
const unauthorizedResponse = (res, message = 'No autorizado') => {
  return errorResponse(res, 401, message);
};

/**
 * Formatear respuesta de prohibido
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} - Respuesta formateada
 */
const forbiddenResponse = (res, message = 'Acceso prohibido') => {
  return errorResponse(res, 403, message);
};

/**
 * Formatear respuesta de no encontrado
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} - Respuesta formateada
 */
const notFoundResponse = (res, message = 'Recurso no encontrado') => {
  return errorResponse(res, 404, message);
};

/**
 * Formatear respuesta de conflicto
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} - Respuesta formateada
 */
const conflictResponse = (res, message) => {
  return errorResponse(res, 409, message);
};

/**
 * Formatear respuesta de error interno del servidor
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @param {Object} error - Objeto de error opcional
 * @returns {Object} - Respuesta formateada
 */
const internalErrorResponse = (res, message = 'Error interno del servidor', error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Solo incluir detalles del error en desarrollo
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return res.status(500).json(response);
};

/**
 * Formatear respuesta de tasa de solicitudes excedida
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} - Respuesta formateada
 */
const rateLimitResponse = (res, message = 'Demasiadas solicitudes') => {
  return errorResponse(res, 429, message);
};

/**
 * Formatear respuesta de servicio no disponible
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} - Respuesta formateada
 */
const serviceUnavailableResponse = (res, message = 'Servicio no disponible') => {
  return errorResponse(res, 503, message);
};

/**
 * Formatear respuesta con metadata adicional
 * @param {Object} res - Objeto response de Express
 * @param {number} statusCode - Codigo de estado HTTP
 * @param {string} message - Mensaje
 * @param {*} data - Datos
 * @param {Object} metadata - Metadata adicional
 * @returns {Object} - Respuesta formateada
 */
const responseWithMetadata = (res, statusCode, message, data, metadata) => {
  const response = {
    success: true,
    message,
    data,
    metadata,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

/**
 * Formatear respuesta de lista
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje
 * @param {Array} items - Items de la lista
 * @param {number} total - Total de items
 * @returns {Object} - Respuesta formateada
 */
const listResponse = (res, message, items, total = null) => {
  const response = {
    success: true,
    message,
    data: {
      items,
      count: items.length,
    },
    timestamp: new Date().toISOString(),
  };

  if (total !== null) {
    response.data.total = total;
  }

  return res.status(200).json(response);
};

/**
 * Formatear respuesta de archivo
 * @param {Object} res - Objeto response de Express
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} contentType - Tipo de contenido
 * @returns {Object} - Respuesta con archivo
 */
const fileResponse = (res, fileBuffer, filename, contentType) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(fileBuffer);
};

/**
 * Formatear respuesta de streaming
 * @param {Object} res - Objeto response de Express
 * @param {string} contentType - Tipo de contenido
 * @returns {Object} - Objeto response configurado para streaming
 */
const streamResponse = (res, contentType = 'text/plain') => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  return res;
};

/**
 * Formatear datos para respuesta
 * @param {*} data - Datos crudos
 * @param {Array} fields - Campos a incluir
 * @returns {Object} - Datos formateados
 */
const formatData = (data, fields = null) => {
  if (!data) {
    return null;
  }

  // Si es un array, formatear cada elemento
  if (Array.isArray(data)) {
    return data.map(item => formatData(item, fields));
  }

  // Si tiene metodo toJSON, usarlo
  if (typeof data.toJSON === 'function') {
    data = data.toJSON();
  }

  // Si no se especifican campos, devolver todo
  if (!fields || fields.length === 0) {
    return data;
  }

  // Filtrar solo los campos especificados
  const formatted = {};
  fields.forEach(field => {
    if (data.hasOwnProperty(field)) {
      formatted[field] = data[field];
    }
  });

  return formatted;
};

/**
 * Sanitizar datos sensibles de la respuesta
 * @param {Object} data - Datos a sanitizar
 * @param {Array} sensitiveFields - Campos sensibles a remover
 * @returns {Object} - Datos sanitizados
 */
const sanitizeResponse = (data, sensitiveFields = ['password', 'token', 'apiKey']) => {
  if (!data) {
    return data;
  }

  // Si es un array, sanitizar cada elemento
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, sensitiveFields));
  }

  // Si no es un objeto, devolverlo tal cual
  if (typeof data !== 'object') {
    return data;
  }

  // Clonar el objeto para no mutar el original
  const sanitized = { ...data };

  // Remover campos sensibles
  sensitiveFields.forEach(field => {
    if (sanitized.hasOwnProperty(field)) {
      delete sanitized[field];
    }
  });

  // Sanitizar objetos anidados
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeResponse(sanitized[key], sensitiveFields);
    }
  });

  return sanitized;
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  noContentResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  internalErrorResponse,
  rateLimitResponse,
  serviceUnavailableResponse,
  responseWithMetadata,
  listResponse,
  fileResponse,
  streamResponse,
  formatData,
  sanitizeResponse,
};