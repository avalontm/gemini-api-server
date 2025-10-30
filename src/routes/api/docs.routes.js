// src/routes/api/docs.routes.js

const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

// Controller (se importara cuando se cree)
// const { getSwaggerSpec } = require('../../controllers/docs.controller');

// Placeholder para cargar el swagger.json
const getSwaggerSpec = () => {
  try {
    const swaggerPath = path.join(process.cwd(), 'swagger.json');
    
    if (fs.existsSync(swaggerPath)) {
      const swaggerFile = fs.readFileSync(swaggerPath, 'utf8');
      return JSON.parse(swaggerFile);
    }
    
    // Si no existe el archivo, retorna una spec basica
    return {
      openapi: '3.0.0',
      info: {
        title: 'Gemini API Server',
        version: '1.0.0',
        description: 'API REST para interactuar con Google Gemini AI',
        contact: {
          name: 'API Support',
          email: 'support@example.com'
        }
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:5000',
          description: 'Servidor de desarrollo'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      tags: [
        {
          name: 'Auth',
          description: 'Endpoints de autenticacion'
        },
        {
          name: 'Gemini',
          description: 'Endpoints de Google Gemini AI'
        },
        {
          name: 'Conversations',
          description: 'Gestion de conversaciones'
        },
        {
          name: 'Export',
          description: 'Exportacion de conversaciones'
        },
        {
          name: 'User',
          description: 'Gestion de perfil de usuario'
        },
        {
          name: 'Health',
          description: 'Estado del servidor'
        }
      ],
      paths: {}
    };
  } catch (error) {
    console.error('Error cargando swagger.json:', error.message);
    return {
      openapi: '3.0.0',
      info: {
        title: 'Gemini API Server',
        version: '1.0.0',
        description: 'Error cargando documentacion. Ejecuta: npm run swagger:generate'
      },
      paths: {}
    };
  }
};

// Opciones de Swagger UI
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 2.5em; }
  `,
  customSiteTitle: 'Gemini API Documentation',
  customfavIcon: '/favicon.ico'
};

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Documentacion Swagger UI
 *     description: Interfaz interactiva de documentacion de la API
 *     tags: [Docs]
 *     responses:
 *       200:
 *         description: Documentacion cargada exitosamente
 */

// Ruta principal de Swagger UI
router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(getSwaggerSpec(), swaggerOptions)
);

/**
 * @swagger
 * /api/docs/json:
 *   get:
 *     summary: Obtener especificacion OpenAPI en JSON
 *     description: Devuelve el archivo swagger.json completo
 *     tags: [Docs]
 *     responses:
 *       200:
 *         description: Especificacion JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/json', (req, res) => {
  const spec = getSwaggerSpec();
  res.json(spec);
});

/**
 * @swagger
 * /api/docs/yaml:
 *   get:
 *     summary: Obtener especificacion OpenAPI en YAML
 *     description: Devuelve la especificacion en formato YAML
 *     tags: [Docs]
 *     responses:
 *       200:
 *         description: Especificacion YAML
 *         content:
 *           text/yaml:
 *             schema:
 *               type: string
 */
router.get('/yaml', (req, res) => {
  try {
    const YAML = require('yamljs');
    const spec = getSwaggerSpec();
    const yamlString = YAML.stringify(spec, 10);
    res.type('text/yaml');
    res.send(yamlString);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error generando YAML',
      error: error.message 
    });
  }
});

module.exports = router;