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

// Filtro de archivos de audio
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de audio no soportado. Solo se permiten: WAV, MP3, WEBM, OGG'), false);
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

// Controller (se importara cuando se cree)
// const { transcribeVoice } = require('../../controllers/gemini/voice.controller');

// Placeholder controller (reemplazar cuando se cree el real)
const transcribeVoice = (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'TranscribeVoice controller pendiente de implementacion',
    receivedData: {
      file: req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      conversationId: req.body.conversationId,
      language: req.body.language,
      prompt: req.body.prompt
    },
    user: {
      id: req.userId,
      email: req.user?.email
    }
  });
};

// Validacion para transcripcion de voz
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

/**
 * @swagger
 * /api/gemini/voice:
 *   post:
 *     summary: Transcribir audio con Gemini
 *     description: Sube un archivo de audio para transcribirlo y opcionalmente procesarlo con un prompt
 *     tags: [Gemini]
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
 *                 description: Archivo de audio a transcribir (WAV, MP3, WEBM)
 *               conversationId:
 *                 type: string
 *                 description: ID de la conversacion existente (opcional)
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
 *         description: Audio transcrito exitosamente
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
 *                     transcription:
 *                       type: string
 *                       description: Texto transcrito del audio
 *                     response:
 *                       type: string
 *                       description: Respuesta procesada si se proporciono un prompt
 *                     conversationId:
 *                       type: string
 *                       description: ID de la conversacion
 *                     messageId:
 *                       type: string
 *                       description: ID del mensaje creado
 *                     audioUrl:
 *                       type: string
 *                       description: URL temporal del audio procesado
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
 *                           example: gemini-1.5-flash
 *                         language:
 *                           type: string
 *                           example: es
 *                         duration:
 *                           type: number
 *                           description: Duracion del audio en segundos
 *                           example: 45.2
 *                         audioFormat:
 *                           type: string
 *                           example: audio/wav
 *                         timestamp:
 *                           type: string
 *                           format: date-time
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
 *         description: Archivo demasiado grande
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
  asyncHandler(transcribeVoice)
);

module.exports = router;