// src/services/swagger/swaggerGenerator.service.js

const fs = require('fs').promises;
const path = require('path');
const routeScanner = require('./routeScanner.service');
const jsdocParser = require('./jsdocParser.service');
const schemaBuilder = require('./schemaBuilder.service');

class SwaggerGeneratorService {
  constructor() {
    this.openAPISpec = {
      openapi: '3.0.0',
      info: {
        title: 'Gemini API Server',
        version: '1.0.0',
        description: 'API server for Gemini AI integration with user authentication and conversation management',
        contact: {
          name: 'API Support',
          email: 'support@example.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Development server'
        },
        {
          url: 'https://api.example.com',
          description: 'Production server'
        }
      ],
      tags: [
        {
          name: 'Auth',
          description: 'Authentication and authorization endpoints'
        },
        {
          name: 'Gemini',
          description: 'Gemini AI integration endpoints'
        },
        {
          name: 'Conversations',
          description: 'Conversation management endpoints'
        },
        {
          name: 'User',
          description: 'User profile management'
        },
        {
          name: 'Export',
          description: 'Export conversations endpoints'
        },
        {
          name: 'Health',
          description: 'Health check endpoints'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from login endpoint'
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token',
            description: 'JWT token stored in cookie'
          }
        },
        responses: {
          UnauthorizedError: {
            description: 'Authentication token is missing or invalid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'No autorizado' }
                  }
                }
              }
            }
          },
          ValidationError: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Error de validacion' },
                    errors: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          ServerError: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Error interno del servidor' }
                  }
                }
              }
            }
          }
        }
      },
      security: []
    };
  }

  /**
   * Genera especificacion OpenAPI completa
   * @param {Object} options - Opciones de generacion
   * @returns {Promise<Object>} - Especificacion OpenAPI
   */
  async generate(options = {}) {
    try {
      const {
        routesPath = path.join(__dirname, '../../routes'),
        outputPath = path.join(__dirname, '../../../swagger.json'),
        includeExamples = true
      } = options;

      console.log('Escaneando rutas...');
      const routes = await routeScanner.scanRoutes(routesPath);

      console.log('Parseando JSDoc...');
      for (const route of routes) {
        const jsdoc = await jsdocParser.parse(route.filePath);
        route.documentation = jsdoc;
      }

      console.log('Construyendo paths...');
      this.openAPISpec.paths = this.buildPaths(routes);

      console.log('Construyendo schemas...');
      this.openAPISpec.components.schemas = schemaBuilder.buildSchemas();

      if (outputPath) {
        console.log('Guardando especificacion...');
        await this.saveSpec(outputPath);
      }

      console.log('Especificacion OpenAPI generada exitosamente');
      return this.openAPISpec;
    } catch (error) {
      throw new Error(`Error generando Swagger: ${error.message}`);
    }
  }

  /**
   * Construye objeto paths de OpenAPI
   * @param {Array} routes - Array de rutas escaneadas
   * @returns {Object} - Objeto paths
   */
  buildPaths(routes) {
    const paths = {};

    for (const route of routes) {
      const path = this.normalizePath(route.path);
      
      if (!paths[path]) {
        paths[path] = {};
      }

      const method = route.method.toLowerCase();
      paths[path][method] = this.buildPathItem(route);
    }

    return paths;
  }

  /**
   * Construye un path item individual
   * @param {Object} route - Informacion de la ruta
   * @returns {Object} - Path item de OpenAPI
   */
  buildPathItem(route) {
    const pathItem = {
      summary: route.documentation?.summary || `${route.method} ${route.path}`,
      description: route.documentation?.description || '',
      tags: route.documentation?.tags || this.inferTags(route.path),
      parameters: this.buildParameters(route),
      responses: this.buildResponses(route)
    };

    if (['post', 'put', 'patch'].includes(route.method.toLowerCase())) {
      pathItem.requestBody = this.buildRequestBody(route);
    }

    if (route.requiresAuth) {
      pathItem.security = [{ bearerAuth: [] }];
    }

    return pathItem;
  }

  /**
   * Construye parametros de la ruta
   * @param {Object} route - Informacion de la ruta
   * @returns {Array} - Array de parametros
   */
  buildParameters(route) {
    const parameters = [];

    const pathParams = route.path.match(/:(\w+)/g);
    if (pathParams) {
      for (const param of pathParams) {
        const paramName = param.substring(1);
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: `${paramName} parameter`
        });
      }
    }

    if (route.documentation?.params) {
      for (const param of route.documentation.params) {
        if (param.in === 'query') {
          parameters.push({
            name: param.name,
            in: 'query',
            required: param.required || false,
            schema: { type: param.type || 'string' },
            description: param.description || ''
          });
        }
      }
    }

    return parameters;
  }

  /**
   * Construye request body
   * @param {Object} route - Informacion de la ruta
   * @returns {Object} - Request body de OpenAPI
   */
  buildRequestBody(route) {
    const requestBody = {
      required: true,
      content: {}
    };

    if (route.documentation?.requestBody) {
      const contentType = route.documentation.requestBody.contentType || 'application/json';
      requestBody.content[contentType] = {
        schema: route.documentation.requestBody.schema || { type: 'object' }
      };

      if (route.documentation.requestBody.example) {
        requestBody.content[contentType].example = route.documentation.requestBody.example;
      }
    } else {
      requestBody.content['application/json'] = {
        schema: { type: 'object' }
      };
    }

    return requestBody;
  }

  /**
   * Construye respuestas
   * @param {Object} route - Informacion de la ruta
   * @returns {Object} - Objeto responses
   */
  buildResponses(route) {
    const responses = {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      },
      '400': { $ref: '#/components/responses/ValidationError' },
      '500': { $ref: '#/components/responses/ServerError' }
    };

    if (route.requiresAuth) {
      responses['401'] = { $ref: '#/components/responses/UnauthorizedError' };
    }

    if (route.documentation?.responses) {
      for (const [code, response] of Object.entries(route.documentation.responses)) {
        responses[code] = {
          description: response.description || '',
          content: {
            'application/json': {
              schema: response.schema || { type: 'object' }
            }
          }
        };

        if (response.example) {
          responses[code].content['application/json'].example = response.example;
        }
      }
    }

    return responses;
  }

  /**
   * Normaliza path para OpenAPI
   * @param {string} path - Path de Express
   * @returns {string} - Path normalizado
   */
  normalizePath(path) {
    return path.replace(/:(\w+)/g, '{$1}');
  }

  /**
   * Infiere tags basado en el path
   * @param {string} path - Path de la ruta
   * @returns {Array<string>} - Tags inferidos
   */
  inferTags(path) {
    if (path.includes('/auth')) return ['Auth'];
    if (path.includes('/gemini')) return ['Gemini'];
    if (path.includes('/conversation')) return ['Conversations'];
    if (path.includes('/user')) return ['User'];
    if (path.includes('/export')) return ['Export'];
    if (path.includes('/health')) return ['Health'];
    return ['General'];
  }

  /**
   * Guarda especificacion en archivo JSON
   * @param {string} outputPath - Ruta del archivo de salida
   * @returns {Promise<void>}
   */
  async saveSpec(outputPath) {
    try {
      const json = JSON.stringify(this.openAPISpec, null, 2);
      await fs.writeFile(outputPath, json, 'utf8');
      console.log(`Especificacion guardada en: ${outputPath}`);
    } catch (error) {
      throw new Error(`Error guardando especificacion: ${error.message}`);
    }
  }

  /**
   * Obtiene especificacion actual
   * @returns {Object} - Especificacion OpenAPI
   */
  getSpec() {
    return this.openAPISpec;
  }

  /**
   * Actualiza informacion del servidor
   * @param {Object} serverInfo - Informacion del servidor
   */
  updateServerInfo(serverInfo) {
    if (serverInfo.title) this.openAPISpec.info.title = serverInfo.title;
    if (serverInfo.version) this.openAPISpec.info.version = serverInfo.version;
    if (serverInfo.description) this.openAPISpec.info.description = serverInfo.description;
    if (serverInfo.contact) this.openAPISpec.info.contact = serverInfo.contact;
  }

  /**
   * Agrega servidor a la lista
   * @param {Object} server - Informacion del servidor
   * @param {string} server.url - URL del servidor
   * @param {string} server.description - Descripcion
   */
  addServer(server) {
    if (!this.openAPISpec.servers) {
      this.openAPISpec.servers = [];
    }
    this.openAPISpec.servers.push(server);
  }

  /**
   * Agrega tag personalizado
   * @param {Object} tag - Tag a agregar
   * @param {string} tag.name - Nombre del tag
   * @param {string} tag.description - Descripcion
   */
  addTag(tag) {
    if (!this.openAPISpec.tags) {
      this.openAPISpec.tags = [];
    }
    this.openAPISpec.tags.push(tag);
  }

  /**
   * Valida especificacion generada
   * @returns {Object} - Resultado de validacion
   */
  validateSpec() {
    const errors = [];
    const warnings = [];

    if (!this.openAPISpec.info.title) {
      errors.push('Falta titulo en info');
    }

    if (!this.openAPISpec.info.version) {
      errors.push('Falta version en info');
    }

    if (Object.keys(this.openAPISpec.paths).length === 0) {
      warnings.push('No se encontraron paths');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Genera especificacion en formato YAML
   * @returns {string} - Especificacion en YAML
   */
  toYAML() {
    const YAML = require('yamljs');
    return YAML.stringify(this.openAPISpec, 10, 2);
  }

  /**
   * Guarda especificacion en formato YAML
   * @param {string} outputPath - Ruta del archivo de salida
   * @returns {Promise<void>}
   */
  async saveYAML(outputPath) {
    try {
      const yaml = this.toYAML();
      await fs.writeFile(outputPath, yaml, 'utf8');
      console.log(`Especificacion YAML guardada en: ${outputPath}`);
    } catch (error) {
      throw new Error(`Error guardando YAML: ${error.message}`);
    }
  }
}

module.exports = new SwaggerGeneratorService();