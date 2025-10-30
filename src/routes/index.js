// src/routes/index.js

const express = require('express');
const router = express.Router();

/**
 * Funcion helper para importar rutas con debugging
 */
function safeImport(path, name) {
  try {
    const module = require(path);
    console.log(`[OK] ${name} importado:`, typeof module);
    
    // Verificar que sea un router valido
    if (!module || typeof module !== 'function') {
      console.error(`[ERROR] ${name} NO es una funcion/router valido:`, module);
      return express.Router(); // Retornar router vacio como fallback
    }
    
    return module;
  } catch (error) {
    console.error(`[ERROR] Error importando ${name}:`, error.message);
    return express.Router(); // Retornar router vacio como fallback
  }
}

// Importar rutas con debugging
console.log('\n=== IMPORTANDO RUTAS ===');

const authRoutes = safeImport('./auth/auth.routes', 'authRoutes');
const textRoutes = safeImport('./api/text.routes', 'textRoutes');
const imageRoutes = safeImport('./api/image.routes', 'imageRoutes');
const voiceRoutes = safeImport('./api/voice.routes', 'voiceRoutes');
const multimodalRoutes = safeImport('./api/multimodal.routes', 'multimodalRoutes');
const pdfRoutes = safeImport('./api/pdf.routes', 'pdfRoutes');
const conversationRoutes = safeImport('./api/conversation.routes', 'conversationRoutes');
const exportRoutes = safeImport('./api/export.routes', 'exportRoutes');
const userRoutes = safeImport('./api/user.routes', 'userRoutes');

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
      user: {
        profile: 'GET /api/user/profile',
        updateProfile: 'PUT /api/user/profile',
        preferences: 'PUT /api/user/preferences',
        stats: 'GET /api/user/stats',
      },
    },
  });
});

/**
 * Montar rutas - Rutas publicas
 */
console.log('Montando rutas...');
router.use('/auth', authRoutes);

/**
 * Rutas de API - Gemini
 */
router.use('/gemini/text', textRoutes);
router.use('/gemini/image', imageRoutes);
router.use('/gemini/voice', voiceRoutes);
router.use('/gemini/multimodal', multimodalRoutes);
router.use('/gemini/pdf', pdfRoutes);

/**
 * Rutas de conversaciones, exportacion y usuario
 */
router.use('/conversations', conversationRoutes);
router.use('/export', exportRoutes);
router.use('/user', userRoutes);

console.log('Rutas montadas exitosamente\n');

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

module.exports = router;