// src/routes/index.js

const express = require('express');
const router = express.Router();

/**
 * Funcion helper para importar rutas con debugging
 */
function safeImport(path, name) {
  try {
    const module = require(path);
    console.log(`[OK] ${name} importado correctamente`);
    
    if (!module) {
      console.error(`[ERROR] ${name} es null o undefined`);
      return express.Router();
    }
    
    if (typeof module.get !== 'function' || typeof module.post !== 'function') {
      console.error(`[ERROR] ${name} NO parece ser un router de Express valido`);
      return express.Router();
    }
    
    return module;
  } catch (error) {
    console.error(`[ERROR] Error importando ${name}:`, error.message);
    console.error(`[ERROR] Stack:`, error.stack);
    return express.Router();
  }
}

// Importar rutas con debugging
console.log('\n=== IMPORTANDO RUTAS ===');

const authRoutes = safeImport('./auth/auth.routes', 'authRoutes');
const healthRoutes = safeImport('./api/health.routes', 'healthRoutes');
const textRoutes = safeImport('./api/text.routes', 'textRoutes');
const imageRoutes = safeImport('./api/image.routes', 'imageRoutes');
const voiceRoutes = safeImport('./api/voice.routes', 'voiceRoutes');
const multimodalRoutes = safeImport('./api/multimodal.routes', 'multimodalRoutes');
const pdfRoutes = safeImport('./api/pdf.routes', 'pdfRoutes');
const conversationRoutes = safeImport('./api/conversation.routes', 'conversationRoutes');
const exportRoutes = safeImport('./api/export.routes', 'exportRoutes');
const reportRoutes = safeImport('./api/report.routes', 'reportRoutes');
const userRoutes = safeImport('./api/user.routes', 'userRoutes');
const apiKeyRoutes = safeImport('./api/apiKey.routes', 'apiKeyRoutes');

console.log('=== RUTAS IMPORTADAS ===\n');

/**
 * Ruta de bienvenida de la API
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Gemini API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile',
      },
      gemini: {
        text: 'POST /api/gemini/text',
        image: 'POST /api/gemini/image',
        voice: 'POST /api/gemini/voice',
        multimodal: 'POST /api/gemini/multimodal',
        pdf: 'POST /api/gemini/pdf',
      },
      conversations: {
        list: 'GET /api/conversations',
        create: 'POST /api/conversations',
        get: 'GET /api/conversations/:id',
        update: 'PUT /api/conversations/:id',
        delete: 'DELETE /api/conversations/:id',
      },
      export: {
        pdf: 'GET /api/export/:conversationId/pdf',
        txt: 'GET /api/export/:conversationId/txt',
        json: 'GET /api/export/:conversationId/json',
      },
      reports: {
        generate: 'POST /api/reports/generate',
        generateAndSave: 'POST /api/reports/generate-and-save',
        fromTemplate: 'POST /api/reports/generate-from-template',
        templates: 'GET /api/reports/templates',
        exportConversation: 'GET /api/reports/conversation/:conversationId/docx',
      },
      user: {
        profile: 'GET /api/user/profile',
        updateProfile: 'PUT /api/user/profile',
        preferences: 'PUT /api/user/preferences',
        stats: 'GET /api/user/stats',
      },
      apiKey: {
        info: 'GET /api/apikey/info',
        set: 'POST /api/apikey/set',
        validate: 'POST /api/apikey/validate',
        toggle: 'POST /api/apikey/toggle',
        delete: 'DELETE /api/apikey/delete',
        stats: 'GET /api/apikey/stats',
        preferences: 'PUT /api/apikey/preferences',
      },
    },
  });
});

/**
 * Montar rutas - Rutas publicas
 */
console.log('Montando rutas de autenticacion...');
router.use('/auth', authRoutes);

console.log('Montando rutas de health...');
router.use('/health', healthRoutes);

/**
 * Rutas de API - Gemini
 */
console.log('Montando rutas de Gemini...');
const geminiRouter = express.Router();
geminiRouter.use('/text', textRoutes);
geminiRouter.use('/image', imageRoutes);
geminiRouter.use('/voice', voiceRoutes);
geminiRouter.use('/multimodal', multimodalRoutes);
geminiRouter.use('/pdf', pdfRoutes);
router.use('/gemini', geminiRouter);

/**
 * Rutas de conversaciones, exportacion, reportes, usuario y API keys
 */
console.log('Montando rutas de conversaciones, reportes, usuario y API keys...');
router.use('/conversations', conversationRoutes);
router.use('/export', exportRoutes);
router.use('/reports', reportRoutes);
router.use('/user', userRoutes);
router.use('/apikey', apiKeyRoutes);

console.log('Todas las rutas montadas exitosamente\n');

/**
 * Ruta de prueba
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Router principal funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

/**
 * Health check dentro de API
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Status detallado dentro de API
 */
router.get('/status', async (req, res) => {
  const mongoose = require('mongoose');
  
  const status = {
    success: true,
    api: 'running',
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
    nodeVersion: process.version
  };

  res.status(200).json(status);
});

module.exports = router;