// src/controllers/docs.controller.js

const swaggerUi = require('swagger-ui-express');
const swaggerGeneratorService = require('../services/swagger/swaggerGenerator.service');

/**
 * Configuracion de Swagger UI
 */
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Gemini API - Documentation',
  customfavIcon: '/favicon.ico'
};

/**
 * Obtener especificacion OpenAPI generada
 */
const getSwaggerSpec = async (req, res, next) => {
  try {
    const spec = await swaggerGeneratorService.generateSpec();
    
    res.status(200).json(spec);
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerar especificacion OpenAPI
 * Solo disponible en desarrollo
 */
const regenerateSwaggerSpec = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Esta accion solo esta disponible en modo desarrollo'
      });
    }

    await swaggerGeneratorService.regenerateSpec();
    
    res.status(200).json({
      success: true,
      message: 'Especificacion Swagger regenerada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener documentacion de un endpoint especifico
 */
const getEndpointDocs = async (req, res, next) => {
  try {
    const { method, path } = req.query;

    if (!method || !path) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los parametros method y path'
      });
    }

    const spec = await swaggerGeneratorService.generateSpec();
    const endpoint = spec.paths[path]?.[method.toLowerCase()];

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado en la documentacion'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        method: method.toUpperCase(),
        path,
        documentation: endpoint
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener lista de todos los endpoints documentados
 */
const getAllEndpoints = async (req, res, next) => {
  try {
    const spec = await swaggerGeneratorService.generateSpec();
    
    const endpoints = [];

    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, details] of Object.entries(methods)) {
        endpoints.push({
          method: method.toUpperCase(),
          path,
          summary: details.summary || 'Sin descripcion',
          tags: details.tags || []
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalEndpoints: endpoints.length,
        endpoints
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadisticas de la API
 */
const getApiStats = async (req, res, next) => {
  try {
    const spec = await swaggerGeneratorService.generateSpec();
    
    const stats = {
      totalPaths: Object.keys(spec.paths || {}).length,
      totalEndpoints: 0,
      endpointsByMethod: {},
      endpointsByTag: {},
      components: {
        schemas: Object.keys(spec.components?.schemas || {}).length,
        securitySchemes: Object.keys(spec.components?.securitySchemes || {}).length
      }
    };

    for (const methods of Object.values(spec.paths || {})) {
      for (const [method, details] of Object.entries(methods)) {
        stats.totalEndpoints++;
        
        const methodUpper = method.toUpperCase();
        stats.endpointsByMethod[methodUpper] = (stats.endpointsByMethod[methodUpper] || 0) + 1;
        
        if (details.tags) {
          for (const tag of details.tags) {
            stats.endpointsByTag[tag] = (stats.endpointsByTag[tag] || 0) + 1;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener documentacion por tag
 */
const getEndpointsByTag = async (req, res, next) => {
  try {
    const { tag } = req.params;

    if (!tag) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un tag'
      });
    }

    const spec = await swaggerGeneratorService.generateSpec();
    const endpoints = [];

    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, details] of Object.entries(methods)) {
        if (details.tags && details.tags.includes(tag)) {
          endpoints.push({
            method: method.toUpperCase(),
            path,
            summary: details.summary || 'Sin descripcion',
            description: details.description,
            parameters: details.parameters,
            requestBody: details.requestBody,
            responses: details.responses
          });
        }
      }
    }

    if (endpoints.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron endpoints con el tag "${tag}"`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        tag,
        totalEndpoints: endpoints.length,
        endpoints
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  swaggerUi,
  swaggerUiOptions,
  getSwaggerSpec,
  regenerateSwaggerSpec,
  getEndpointDocs,
  getAllEndpoints,
  getApiStats,
  getEndpointsByTag
};