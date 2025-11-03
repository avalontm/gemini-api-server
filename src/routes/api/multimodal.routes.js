// src/routes/api/multimodal.routes.js

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { uploadLimiter } = require('../../middlewares/rateLimiter');
const { body, validationResult } = require('express-validator');

// Multer configuracion para multiples archivos
const multer = require('multer');
const path = require('path');

// Configuracion de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, 'uploads/images/');
    } else if (file.mimetype.startsWith('audio/')) {
      cb(null, 'uploads/audio/');
    } else if (file.mimetype === 'application/pdf') {
      cb(null, 'uploads/pdfs/');
    } else {
      cb(null, 'uploads/temp/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'multimodal-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos multimodales
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado'), false);
  }
};

// Crear instancia de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
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

// Controller
const { 
  processMultimodal, 
  processMultimodalStream,
  compareFiles 
} = require('../../controllers/gemini/multimodal.controller');

// Validacion para consultas multimodales
const multimodalValidation = [
  body('prompt')
    .optional()
    .isString()
    .withMessage('El prompt debe ser un texto')
    .trim()
    .isLength({ min: 1, max: 8000 })
    .withMessage('El prompt debe tener entre 1 y 8000 caracteres'),
  
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('ID de conversacion invalido'),
  
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature debe estar entre 0 y 2')
];

// Validacion para comparacion
const compareValidation = [
  body('criteria')
    .optional()
    .isString()
    .withMessage('El criterio debe ser un texto')
    .trim()
    .isLength({ max: 2000 })
    .withMessage('El criterio debe tener maximo 2000 caracteres'),
  
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('ID de conversacion invalido'),
  
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature debe estar entre 0 y 2')
];

/**
 * @swagger
 * /api/gemini/multimodal:
 *   post:
 *     summary: Procesamiento multimodal con Gemini
 *     description: Envia una consulta combinando texto con multiples archivos (imagenes, audio, documentos PDF). Soporta hasta 10 archivos simultaneos de diferentes tipos.
 *     tags: [Gemini - Multimodal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Pregunta o instruccion principal (opcional si se envian archivos)
 *                 minLength: 1
 *                 maxLength: 8000
 *                 example: Analiza estas imagenes y dimelo que tienen en comun
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiples archivos a procesar (imagenes JPG/PNG/WEBP/GIF, audio WAV/MP3/OGG/WEBM, PDFs)
 *                 maxItems: 10
 *               conversationId:
 *                 type: string
 *                 description: ID de la conversacion existente para continuar el contexto (opcional)
 *                 example: 507f1f77bcf86cd799439011
 *               temperature:
 *                 type: number
 *                 description: Controla la creatividad de la respuesta (0 mas conservador, 2 mas creativo)
 *                 minimum: 0
 *                 maximum: 2
 *                 default: 0.7
 *                 example: 0.7
 *     responses:
 *       200:
 *         description: Contenido multimodal procesado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     response:
 *                       type: string
 *                       description: Respuesta generada por Gemini
 *                       example: Las imagenes muestran paisajes naturales con montanas y cielos despejados. Todas comparten una paleta de colores frios y una composicion horizontal.
 *                     conversationId:
 *                       type: string
 *                       description: ID de la conversacion (nuevo o existente)
 *                       example: 507f1f77bcf86cd799439011
 *                     messageId:
 *                       type: string
 *                       description: ID del mensaje creado
 *                       example: 507f1f77bcf86cd799439012
 *                     attachments:
 *                       type: array
 *                       description: Lista de archivos procesados
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [image, audio, pdf]
 *                             example: image
 *                           name:
 *                             type: string
 *                             example: imagen1.jpg
 *                           size:
 *                             type: integer
 *                             example: 245678
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         prompt:
 *                           type: integer
 *                           example: 150
 *                         completion:
 *                           type: integer
 *                           example: 320
 *                         total:
 *                           type: integer
 *                           example: 470
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         model:
 *                           type: string
 *                           example: gemini-2.0-flash-exp
 *                         filesProcessed:
 *                           type: integer
 *                           example: 3
 *                         fileTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: [image, pdf]
 *                         temperature:
 *                           type: number
 *                           example: 0.7
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: 2024-01-15T10:30:00.000Z
 *       400:
 *         description: Error de validacion o formato de archivo invalido
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
 *                   example: Error de validacion
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: prompt
 *                       message:
 *                         type: string
 *                         example: El prompt debe tener entre 1 y 8000 caracteres
 *       401:
 *         description: No autorizado - Token invalido o expirado
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
 *                   example: Token no valido
 *       413:
 *         description: Archivos demasiado grandes o demasiados archivos
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
 *                   example: Archivo demasiado grande. Maximo 10MB por archivo
 *       429:
 *         description: Demasiadas peticiones - Rate limit excedido
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
 *                   example: Demasiadas solicitudes. Intente nuevamente en unos minutos
 *       500:
 *         description: Error interno del servidor
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
 *                   example: Error procesando contenido multimodal
 *                 error:
 *                   type: string
 *                   example: Error interno al procesar archivos
 */
router.post(
  '/',
  authenticate,
  uploadLimiter,
  upload.array('files', 10),
  ...multimodalValidation,
  validate,
  asyncHandler(processMultimodal)
);

/**
 * @swagger
 * /api/gemini/multimodal/stream:
 *   post:
 *     summary: Procesamiento multimodal con streaming
 *     description: Similar al endpoint principal pero con respuesta en tiempo real (streaming). La respuesta se envia en formato Server-Sent Events (SSE).
 *     tags: [Gemini - Multimodal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Pregunta o instruccion principal
 *                 example: Describe detalladamente estas imagenes
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Archivos a procesar
 *                 maxItems: 10
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               temperature:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 2
 *                 default: 0.7
 *     responses:
 *       200:
 *         description: Stream de respuesta multimodal (text/event-stream)
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [chunk, done, error]
 *                   description: Tipo de evento (chunk para fragmentos, done para final, error para errores)
 *                 chunk:
 *                   type: string
 *                   description: Fragmento de texto (solo en type chunk)
 *                 accumulated:
 *                   type: string
 *                   description: Texto acumulado hasta el momento (solo en type chunk)
 *                 chunkNumber:
 *                   type: integer
 *                   description: Numero de fragmento (solo en type chunk)
 *                 conversationId:
 *                   type: string
 *                   description: ID de conversacion
 *                 result:
 *                   type: object
 *                   description: Resultado final (solo en type done)
 *             example: |
 *               data: {"type":"chunk","chunk":"Las imagenes","accumulated":"Las imagenes","chunkNumber":1,"conversationId":"507f..."}
 *               
 *               data: {"type":"chunk","chunk":" muestran","accumulated":"Las imagenes muestran","chunkNumber":2,"conversationId":"507f..."}
 *               
 *               data: {"type":"done","result":{"response":"...","conversationId":"507f...","tokens":{...}}}
 *       400:
 *         description: Error de validacion
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/stream',
  authenticate,
  uploadLimiter,
  upload.array('files', 10),
  ...multimodalValidation,
  validate,
  asyncHandler(processMultimodalStream)
);

/**
 * @swagger
 * /api/gemini/multimodal/compare:
 *   post:
 *     summary: Comparar multiples archivos
 *     description: Compara 2 o mas archivos segun un criterio especifico. Util para analizar diferencias, similitudes o relaciones entre documentos, imagenes o audios.
 *     tags: [Gemini - Multimodal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Minimo 2 archivos para comparar
 *                 minItems: 2
 *                 maxItems: 10
 *               criteria:
 *                 type: string
 *                 description: Criterio de comparacion (opcional, por defecto compara similitudes y diferencias)
 *                 maxLength: 2000
 *                 example: Compara la calidad visual y composicion de estas imagenes
 *               conversationId:
 *                 type: string
 *                 description: ID de conversacion existente
 *                 example: 507f1f77bcf86cd799439011
 *               temperature:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 2
 *                 default: 0.7
 *     responses:
 *       200:
 *         description: Comparacion exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     response:
 *                       type: string
 *                       example: Ambas imagenes comparten una composicion minimalista pero difieren en la paleta de colores. La primera usa tonos calidos mientras la segunda prefiere tonos frios.
 *                     conversationId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     messageId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439012
 *                     comparedFiles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: image
 *                           name:
 *                             type: string
 *                             example: foto1.jpg
 *                           size:
 *                             type: integer
 *                             example: 156789
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         prompt:
 *                           type: integer
 *                         completion:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         model:
 *                           type: string
 *                           example: gemini-2.0-flash-exp
 *                         filesCompared:
 *                           type: integer
 *                           example: 2
 *                         fileTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: [image]
 *                         comparisonMode:
 *                           type: boolean
 *                           example: true
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Error - Se requieren al menos 2 archivos
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
 *                   example: Se requieren al menos 2 archivos para comparar
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/compare',
  authenticate,
  uploadLimiter,
  upload.array('files', 10),
  ...compareValidation,
  validate,
  asyncHandler(compareFiles)
);

module.exports = router;