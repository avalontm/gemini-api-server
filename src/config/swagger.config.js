// src/config/swagger.config.js

/**
 * Configuracion de Swagger UI y OpenAPI
 */

const swaggerConfig = {
  // Habilitar o deshabilitar Swagger
  enabled: process.env.SWAGGER_ENABLED === 'true' || true,
  
  // Ruta donde se montara Swagger UI
  path: process.env.SWAGGER_PATH || '/api/docs',
  
  // Definicion OpenAPI 3.0
  definition: {
    openapi: '3.0.0',
    
    info: {
      title: process.env.SWAGGER_TITLE || 'Servidor API Gemini',
      version: process.env.SWAGGER_VERSION || '1.0.0',
      description: process.env.SWAGGER_DESCRIPTION || 'API server con integracion de Gemini AI, autenticacion de usuarios y MongoDB',
      contact: {
        name: process.env.SWAGGER_CONTACT_NAME || 'Equipo de Desarrollo',
        email: process.env.SWAGGER_CONTACT_EMAIL || 'dev@ejemplo.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.ejemplo.com' 
          : `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === 'production' 
          ? 'Servidor de Produccion' 
          : 'Servidor de Desarrollo',
      },
    ],
    
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingrese el token JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Token JWT en cookie',
        },
      },
      
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error al procesar la solicitud',
            },
            message: {
              type: 'string',
              example: 'Descripcion detallada del error',
            },
          },
        },
        
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            message: {
              type: 'string',
              example: 'Operacion exitosa',
            },
          },
        },
        
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              example: 'usuario123',
            },
            email: {
              type: 'string',
              example: 'usuario@ejemplo.com',
            },
            role: {
              type: 'string',
              example: 'user',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        
        Conversation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            title: {
              type: 'string',
              example: 'Mi conversacion con Gemini',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['tecnologia', 'IA'],
            },
            messages: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            tokenUsage: {
              type: 'object',
              properties: {
                total: {
                  type: 'number',
                  example: 1500,
                },
                estimatedCost: {
                  type: 'number',
                  example: 0.015,
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            conversationId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            role: {
              type: 'string',
              enum: ['user', 'assistant'],
              example: 'user',
            },
            content: {
              type: 'string',
              example: 'Hola, como estas?',
            },
            type: {
              type: 'string',
              enum: ['text', 'image', 'voice', 'multimodal'],
              example: 'text',
            },
            tokens: {
              type: 'number',
              example: 150,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    
    security: [
      {
        bearerAuth: [],
      },
    ],
    
    tags: [
      {
        name: 'Auth',
        description: 'Endpoints de autenticacion',
      },
      {
        name: 'Gemini',
        description: 'Endpoints de la API de Gemini',
      },
      {
        name: 'Conversations',
        description: 'Gestion de conversaciones',
      },
      {
        name: 'User',
        description: 'Gestion de usuarios',
      },
      {
        name: 'Export',
        description: 'Exportacion de datos',
      },
      {
        name: 'Health',
        description: 'Estado del servidor',
      },
    ],
  },
  
  // Opciones de Swagger UI
  uiOptions: {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Gemini - Documentacion',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  },
  
  // Rutas a escanear para generar documentacion automatica
  apis: [
    './src/routes/**/*.js',
    './src/controllers/**/*.js',
  ],
};

/**
 * Opciones de swagger-jsdoc
 */
const swaggerJsDocOptions = {
  definition: swaggerConfig.definition,
  apis: swaggerConfig.apis,
};

/**
 * Validar configuracion de Swagger
 * @returns {Object} - Resultado de validacion
 */
const validateSwaggerConfig = () => {
  const errors = [];
  
  if (!swaggerConfig.definition.info.title) {
    errors.push('Titulo de Swagger no configurado');
  }
  
  if (!swaggerConfig.definition.info.version) {
    errors.push('Version de Swagger no configurada');
  }
  
  if (!swaggerConfig.path) {
    errors.push('Ruta de Swagger no configurada');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  swaggerConfig,
  swaggerJsDocOptions,
  validateSwaggerConfig,
};