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
    // Determinar carpeta segun tipo de archivo
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
    fileSize: 10 * 1024 * 1024, // 10MB por archivo
    files: 10 // Maximo 10 archivos
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
// const { processMultimodal } = require('../../controllers/gemini/multimodal.controller');

// Placeholder controller (reemplazar cuando se cree el real)
const processMultimodal = (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'ProcessMultimodal controller pendiente de implementacion',
    receivedData: {
      prompt: req.body.prompt,
      files: req.files ? req.files.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path
      })) : [],
      filesCount: req.files ? req.files.length : 0,
      conversationId: req.body.conversationId,
      temperature: req.body.temperature
    },
    user: {
      id: req.userId,
      email: req.user?.email
    }
  });
};

// Validacion para consultas multimodales
const multimodalValidation = [
  body('prompt')
    .notEmpty()
    .withMessage('El prompt es requerido')
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

/**
 * @swagger
 * /api/gemini/multimodal:
 *   post:
 *     summary: Procesamiento multimodal con Gemini
 *     description: Envia una consulta combinando texto con multiples archivos (imagenes, audio, documentos)
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
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Pregunta o instruccion principal
 *                 minLength: 1
 *                 maxLength: 8000
 *                 example: Analiza estas imagenes y dimelo que tienen en comun
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiples archivos a procesar (imagenes, audio, PDFs)
 *                 maxItems: 10
 *               conversationId:
 *                 type: string
 *                 description: ID de la conversacion existente (opcional)
 *                 example: 507f1f77bcf86cd799439011
 *               temperature:
 *                 type: number
 *                 description: Creatividad de la respuesta (0-2)
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
 *                     conversationId:
 *                       type: string
 *                       description: ID de la conversacion
 *                     messageId:
 *                       type: string
 *                       description: ID del mensaje creado
 *                     attachments:
 *                       type: array
 *                       description: Lista de archivos procesados
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: image
 *                           url:
 *                             type: string
 *                             example: /uploads/images/abc123.jpg
 *                           name:
 *                             type: string
 *                             example: imagen1.jpg
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
 *                         filesProcessed:
 *                           type: integer
 *                           example: 3
 *                         fileTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: [image, audio, pdf]
 *                         temperature:
 *                           type: number
 *                           example: 0.7
 *                         timestamp:
 *                           type: string
 *                           format: date-time
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
 *                   example: Uno o mas archivos tienen formato invalido
 *       401:
 *         description: No autorizado - Token invalido o expirado
 *       413:
 *         description: Archivos demasiado grandes o demasiados archivos
 *       429:
 *         description: Demasiadas peticiones - Rate limit excedido
 *       500:
 *         description: Error interno del servidor
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

module.exports = router;