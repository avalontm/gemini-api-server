// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

// Crear aplicacion Express primero
const app = express();

// IMPORTAR CONFIGURACIONES DE FORMA SEGURA

let corsConfig;
try {
  corsConfig = require('./config/cors.config');
} catch (error) {
  console.error('Error cargando cors.config:', error.message);
  corsConfig = { origin: '*' };
}

let swaggerConfigModule;
try {
  swaggerConfigModule = require('./config/swagger.config');
} catch (error) {
  console.error('Error cargando swagger.config:', error.message);
  swaggerConfigModule = { 
    swaggerConfig: { 
      enabled: false, 
      path: '/api/docs' 
    } 
  };
}

const swaggerEnabled = swaggerConfigModule.swaggerConfig?.enabled || false;
const swaggerPath = swaggerConfigModule.swaggerConfig?.path || '/api/docs';

// IMPORTAR MIDDLEWARES DE FORMA SEGURA

let errorHandler;
try {
  const errorHandlerModule = require('./middlewares/errorHandler');
  errorHandler = errorHandlerModule.errorHandler;
  if (typeof errorHandler !== 'function') {
    throw new Error('errorHandler no es una funcion');
  }
} catch (error) {
  console.error('Error cargando errorHandler:', error.message);
  errorHandler = (err, req, res, next) => {
    res.status(500).json({ success: false, message: 'Error del servidor', error: err.message });
  };
}

let requestLogger;
try {
  requestLogger = require('./middlewares/requestLogger');
  if (typeof requestLogger !== 'function') {
    if (requestLogger && typeof requestLogger.requestLogger === 'function') {
      requestLogger = requestLogger.requestLogger;
    } else {
      throw new Error('requestLogger no es una funcion');
    }
  }
} catch (error) {
  console.error('Error cargando requestLogger:', error.message);
  requestLogger = (req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  };
}

let generalLimiter;
try {
  const rateLimiterModule = require('./middlewares/rateLimiter');
  generalLimiter = rateLimiterModule.generalLimiter;
  if (typeof generalLimiter !== 'function') {
    throw new Error('generalLimiter no es una funcion');
  }
} catch (error) {
  console.error('Error cargando rateLimiter:', error.message);
  generalLimiter = (req, res, next) => next();
}

// IMPORTAR RUTAS DE FORMA SEGURA

let routes;
try {
  routes = require('./routes');
  if (typeof routes !== 'function') {
    throw new Error('routes no es una funcion');
  }
  console.log('Routes cargadas correctamente');
} catch (error) {
  console.error('Error cargando routes:', error.message);
  routes = express.Router();
  routes.get('/', (req, res) => {
    res.json({ success: false, message: 'Error cargando rutas', error: error.message });
  });
}

// MIDDLEWARES GLOBALES

// 1. Seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS
app.use(cors(corsConfig));

// 3. Compresion de respuestas
app.use(compression());

// 4. Parseo de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Parseo de cookies
app.use(cookieParser());

// 6. Logging de requests
app.use(requestLogger);

// 7. Archivos estaticos (opcional)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/exports', express.static(path.join(__dirname, '../exports')));

// HEALTH CHECK

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/status', async (req, res) => {
  const mongoose = require('mongoose');
  
  const status = {
    success: true,
    server: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A'
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
    },
    cpu: {
      user: process.cpuUsage().user,
      system: process.cpuUsage().system
    }
  };

  res.status(200).json(status);
});

// API ROUTES

// Rate limiting solo para rutas de API
if (typeof generalLimiter === 'function') {
  app.use('/api', generalLimiter);
}

// Montar todas las rutas
if (typeof routes === 'function') {
  app.use('/api', routes);
}

// SWAGGER DOCUMENTATION

if (swaggerEnabled) {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerJsdoc = require('swagger-jsdoc');
    
    const swaggerOptions = {
      definition: swaggerConfigModule.swaggerConfig.definition,
      apis: [
        './src/routes/**/*.js',
        './src/routes/auth/*.js',
        './src/routes/api/*.js'
      ],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    const uiOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Gemini API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      }
    };

    app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec, uiOptions));
    console.log(`Swagger UI disponible en: http://localhost:${process.env.PORT || 5000}${swaggerPath}`);
  } catch (error) {
    console.error('Error cargando Swagger:', error.message);
  }
}

// RUTA RAIZ

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bienvenido a Gemini API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      status: '/status',
      api: '/api',
      docs: swaggerEnabled ? swaggerPath : 'Deshabilitado'
    }
  });
});

// MANEJO DE RUTAS NO ENCONTRADAS
// CORREGIDO: Sin asterisco para Express 5
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// MANEJADOR DE ERRORES GLOBAL

app.use(errorHandler);

// EXPORTAR APP

module.exports = app;