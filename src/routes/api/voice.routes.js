// src/routes/api/voice.routes.js

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { uploadLimiter } = require('../../middlewares/rateLimiter');
const { body, validationResult } = require('express-validator');

// Multer configuracion para audio
const multer = require('multer');
const path = require('path');

// Configuracion de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/audio/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos de audio (mas permisivo)
const fileFilter = (req, file, cb) => {
  // Lista completa de tipos MIME de audio aceptados
  const allowedTypes = [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/mpeg3',
    'audio/x-mpeg-3',
    'audio/webm',
    'audio/ogg',
    'audio/opus',
    'audio/x-m4a',
    'audio/m4a',
    'audio/mp4',
    'audio/flac',
    'audio/x-flac'
  ];
  
  // Tambien validar por extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.wav', '.mp3', '.webm', '.ogg', '.opus', '.m4a', '.mp4', '.flac'];
  
  const isMimeTypeValid = allowedTypes.includes(file.mimetype);
  const isExtensionValid = allowedExtensions.includes(ext);
  
  if (isMimeTypeValid || isExtensionValid) {
    cb(null, true);
  } else {
    cb(new Error(`Formato de audio no soportado. Tipo recibido: ${file.mimetype}, Extension: ${ext}. Formatos permitidos: WAV, MP3, WEBM, OGG, M4A, FLAC`), false);
  }
};

// Crear instancia de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// Middleware de validacion
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validacion',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Importar controller real
const { processVoice, transcribeOnly, analyzeVoice } = require('../../controllers/gemini/voice.controller');

// Validacion para procesamiento de voz
const voiceValidation = [
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('ID de conversacion invalido'),
  
  body('language')
    .optional()
    .isString()
    .isIn(['es', 'en', 'fr', 'de', 'it', 'pt', 'auto'])
    .withMessage('Idioma no soportado. Opciones: es, en, fr, de, it, pt, auto'),
  
  body('prompt')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('El prompt adicional no debe exceder 2000 caracteres')
];

// Validacion para analisis de voz
const analyzeValidation = [
  body('instruction')
    .notEmpty()
    .withMessage('La instruccion es requerida')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('La instruccion debe tener entre 1 y 2000 caracteres'),
  
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('ID de conversacion invalido')
];

/**
 * @swagger
 * /api/gemini/voice:
 *   post:
 *     summary: Transcribir y procesar audio con Gemini
 *     description: Sube un archivo de audio para transcribirlo y generar una respuesta usando Gemini. El audio se transcribe automaticamente y luego se procesa como texto.
 *     tags: [Gemini - Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de audio a transcribir (WAV, MP3, WEBM, OGG, M4A, FLAC)
 *               conversationId:
 *                 type: string
 *                 description: ID de la conversacion existente para mantener contexto (opcional)
 *                 example: 507f1f77bcf86cd799439011
 *               language:
 *                 type: string
 *                 description: Idioma del audio (opcional, auto-detecta por defecto)
 *                 enum: [es, en, fr, de, it, pt, auto]
 *                 default: auto
 *                 example: es
 *               prompt:
 *                 type: string
 *                 description: Instruccion adicional para procesar la transcripcion (opcional)
 *                 maxLength: 2000
 *                 example: Resume el contenido del audio en 3 puntos clave
 *     responses:
 *       200:
 *         description: Audio transcrito y procesado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Audio procesado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     transcription:
 *                       type: string
 *                       description: Texto transcrito del audio
 *                       example: Hola, este es un mensaje de prueba para transcribir.
 *                     response:
 *                       type: string
 *                       description: Respuesta generada por Gemini
 *                       example: Entiendo, has enviado un mensaje de prueba. ¿En que puedo ayudarte?
 *                     conversationId:
 *                       type: string
 *                       description: ID de la conversacion
 *                       example: 507f1f77bcf86cd799439011
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         prompt:
 *                           type: integer
 *                           example: 15
 *                         completion:
 *                           type: integer
 *                           example: 25
 *                         total:
 *                           type: integer
 *                           example: 40
 *       400:
 *         description: Error de validacion o formato de audio invalido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Formato de audio no soportado
 *       401:
 *         description: No autorizado - Token invalido o expirado
 *       413:
 *         description: Archivo demasiado grande (maximo 25MB)
 *       429:
 *         description: Demasiadas peticiones - Rate limit excedido
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  authenticate,
  uploadLimiter,
  upload.single('audio'),
  ...voiceValidation,
  validate,
  asyncHandler(processVoice)
);

/**
 * @swagger
 * /api/gemini/voice/transcribe:
 *   post:
 *     summary: Solo transcribir audio sin generar respuesta
 *     description: Transcribe un archivo de audio a texto sin procesamiento adicional. Util cuando solo necesitas la transcripcion sin analisis.
 *     tags: [Gemini - Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de audio a transcribir
 *     responses:
 *       200:
 *         description: Audio transcrito exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Audio transcrito exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     transcription:
 *                       type: string
 *                       example: Este es el texto transcrito del audio
 *       400:
 *         description: Error de validacion
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/transcribe',
  authenticate,
  uploadLimiter,
  upload.single('audio'),
  asyncHandler(transcribeOnly)
);

/**
 * @swagger
 * /api/gemini/voice/analyze:
 *   post:
 *     summary: Analizar contenido de audio con instrucciones especificas
 *     description: Transcribe un audio y lo analiza segun instrucciones especificas. Permite resumir, extraer informacion clave, traducir, etc.
 *     tags: [Gemini - Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *               - instruction
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de audio a analizar
 *               instruction:
 *                 type: string
 *                 description: Instruccion especifica para analizar el contenido
 *                 example: Resume el contenido de este audio en 3 puntos clave y destaca las ideas principales
 *               conversationId:
 *                 type: string
 *                 description: ID de conversacion existente
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Audio analizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Audio analizado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     transcription:
 *                       type: string
 *                       example: Texto original transcrito...
 *                     analysis:
 *                       type: string
 *                       example: Resumen en 3 puntos - 1. Primer punto clave...
 *                     conversationId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         prompt:
 *                           type: integer
 *                         completion:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       400:
 *         description: Datos invalidos o instruccion faltante
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/analyze',
  authenticate,
  uploadLimiter,
  upload.single('audio'),
  ...analyzeValidation,
  validate,
  asyncHandler(analyzeVoice)
);

module.exports = router