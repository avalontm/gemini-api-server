// src/decorators/swagger.decorator.js

/**
 * Decoradores para agregar metadata de Swagger a las rutas
 * Estos decoradores facilitan la documentacion automatica de la API
 */

/**
 * Decorador para documentar un endpoint
 * @param {Object} options - Opciones de documentacion
 * @param {string} options.summary - Resumen breve del endpoint
 * @param {string} options.description - Descripcion detallada
 * @param {Array} options.tags - Tags para agrupar endpoints
 * @param {Object} options.responses - Respuestas posibles
 * @param {Object} options.requestBody - Cuerpo de la peticion
 * @param {Array} options.parameters - Parametros de la peticion
 * @param {boolean} options.security - Si requiere autenticacion
 * @returns {Function} - Decorador
 */
const swaggerDoc = (options) => {
  return (target, propertyKey, descriptor) => {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    
    const originalMethod = descriptor.value;
    
    // Agregar metadata al metodo
    descriptor.value._swaggerMetadata = {
      summary: options.summary || '',
      description: options.description || '',
      tags: options.tags || [],
      responses: options.responses || {},
      requestBody: options.requestBody || null,
      parameters: options.parameters || [],
      security: options.security !== false ? [{ bearerAuth: [] }] : [],
      operationId: options.operationId || propertyKey,
    };
    
    return descriptor;
  };
};

/**
 * Decorador para especificar que un endpoint requiere autenticacion
 * @returns {Function} - Decorador
 */
const requireAuth = () => {
  return (target, propertyKey, descriptor) => {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    
    if (!descriptor.value._swaggerMetadata) {
      descriptor.value._swaggerMetadata = {};
    }
    
    descriptor.value._swaggerMetadata.security = [{ bearerAuth: [] }];
    
    return descriptor;
  };
};

/**
 * Decorador para especificar que un endpoint es publico (no requiere auth)
 * @returns {Function} - Decorador
 */
const publicEndpoint = () => {
  return (target, propertyKey, descriptor) => {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    
    if (!descriptor.value._swaggerMetadata) {
      descriptor.value._swaggerMetadata = {};
    }
    
    descriptor.value._swaggerMetadata.security = [];
    
    return descriptor;
  };
};

/**
 * Decorador para agregar tags a un endpoint
 * @param {...string} tags - Tags del endpoint
 * @returns {Function} - Decorador
 */
const swaggerTags = (...tags) => {
  return (target, propertyKey, descriptor) => {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    
    if (!descriptor.value._swaggerMetadata) {
      descriptor.value._swaggerMetadata = {};
    }
    
    descriptor.value._swaggerMetadata.tags = tags;
    
    return descriptor;
  };
};

/**
 * Decorador para agregar parametros de query a un endpoint
 * @param {Array} parameters - Array de parametros
 * @returns {Function} - Decorador
 */
const swaggerParams = (parameters) => {
  return (target, propertyKey, descriptor) => {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    
    if (!descriptor.value._swaggerMetadata) {
      descriptor.value._swaggerMetadata = {};
    }
    
    descriptor.value._swaggerMetadata.parameters = parameters;
    
    return descriptor;
  };
};

/**
 * Decorador para agregar cuerpo de peticion a un endpoint
 * @param {Object} requestBody - Especificacion del request body
 * @returns {Function} - Decorador
 */
const swaggerBody = (requestBody) => {
  return (target, propertyKey, descriptor) => {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    
    if (!descriptor.value._swaggerMetadata) {
      descriptor.value._swaggerMetadata = {};
    }
    
    descriptor.value._swaggerMetadata.requestBody = requestBody;
    
    return descriptor;
  };
};

/**
 * Decorador para agregar respuestas a un endpoint
 * @param {Object} responses - Objeto con respuestas por codigo de estado
 * @returns {Function} - Decorador
 */
const swaggerResponses = (responses) => {
  return (target, propertyKey, descriptor) => {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    }
    
    if (!descriptor.value._swaggerMetadata) {
      descriptor.value._swaggerMetadata = {};
    }
    
    descriptor.value._swaggerMetadata.responses = responses;
    
    return descriptor;
  };
};

/**
 * Helper para crear respuesta de error estandar
 * @param {number} status - Codigo de estado HTTP
 * @param {string} description - Descripcion del error
 * @returns {Object} - Especificacion de respuesta
 */
const errorResponse = (status, description) => {
  return {
    [status]: {
      description: description,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error',
          },
        },
      },
    },
  };
};

/**
 * Helper para crear respuesta de exito estandar
 * @param {number} status - Codigo de estado HTTP
 * @param {string} description - Descripcion del exito
 * @param {Object} schema - Schema de datos
 * @returns {Object} - Especificacion de respuesta
 */
const successResponse = (status, description, schema = null) => {
  return {
    [status]: {
      description: description,
      content: {
        'application/json': {
          schema: schema || {
            $ref: '#/components/schemas/Success',
          },
        },
      },
    },
  };
};

/**
 * Helper para crear parametro de path
 * @param {string} name - Nombre del parametro
 * @param {string} description - Descripcion del parametro
 * @param {boolean} required - Si es requerido
 * @returns {Object} - Especificacion de parametro
 */
const pathParam = (name, description, required = true) => {
  return {
    name: name,
    in: 'path',
    description: description,
    required: required,
    schema: {
      type: 'string',
    },
  };
};

/**
 * Helper para crear parametro de query
 * @param {string} name - Nombre del parametro
 * @param {string} description - Descripcion del parametro
 * @param {string} type - Tipo de dato
 * @param {boolean} required - Si es requerido
 * @returns {Object} - Especificacion de parametro
 */
const queryParam = (name, description, type = 'string', required = false) => {
  return {
    name: name,
    in: 'query',
    description: description,
    required: required,
    schema: {
      type: type,
    },
  };
};

/**
 * Helper para crear request body multipart/form-data
 * @param {Object} properties - Propiedades del form data
 * @param {boolean} required - Si es requerido
 * @returns {Object} - Especificacion de request body
 */
const multipartBody = (properties, required = true) => {
  return {
    required: required,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties: properties,
        },
      },
    },
  };
};

/**
 * Helper para crear request body application/json
 * @param {Object} schema - Schema del body
 * @param {boolean} required - Si es requerido
 * @returns {Object} - Especificacion de request body
 */
const jsonBody = (schema, required = true) => {
  return {
    required: required,
    content: {
      'application/json': {
        schema: schema,
      },
    },
  };
};

module.exports = {
  swaggerDoc,
  requireAuth,
  publicEndpoint,
  swaggerTags,
  swaggerParams,
  swaggerBody,
  swaggerResponses,
  errorResponse,
  successResponse,
  pathParam,
  queryParam,
  multipartBody,
  jsonBody,
};