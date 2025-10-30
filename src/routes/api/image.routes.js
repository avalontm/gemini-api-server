// src/routes/api/image.routes.js

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { uploadLimiter } = require('../../middlewares/rateLimiter');
const { body, validationResult } = require('express-validator');

// Multer configuracion para imagenes
const multer = require('multer');
const path = require('path');

// Configuracion de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no soportado. Solo se permiten: JPEG, PNG, WEBP, GIF'), false);
  }
};

// Crear instancia de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
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
// const { analyzeImage } = require('../../controllers/gemini/image.controller');

// Placeholder controller (reemplazar cuando se cree el real)
const analyzeImage = (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'AnalyzeImage controller pendiente de implementacion',
    receivedData: {
      prompt: req.body.prompt,
      file: req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      conversationId: req.body.conversationId
    },
    user: {
      id: req.userId,
      email: req.user?.email
    }
  });
};

// Validacion para analisis de imagenes
const imageValidation = [
  body('prompt')
    .notEmpty()
    .withMessage('El prompt es requerido')
    .isString()
    .withMessage('El prompt debe ser un texto')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('El prompt debe tener entre 1 y 5000 caracteres'),
  
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('ID de conversacion invalido')
];

/**
 * @swagger
 * /api/gemini/image:
 *   post:
 *     summary: Analizar imagen con Gemini Vision
 *     description: Sube una imagen y envia un prompt para que Gemini la analice y genere una respuesta
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
 *               - image
 *               - prompt
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen a analizar (JPEG, PNG, WEBP, GIF)
 *               prompt:
 *                 type: string
 *                 description: Pregunta o instruccion sobre la imagen
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: Describe lo que ves en esta imagen con detalle
 *               conversationId:
 *                 type: string
 *                 description: ID de la conversacion existente (opcional)
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Imagen analizada exitosamente
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
 *                       description: Analisis generado por Gemini Vision
 *                     conversationId:
 *                       type: string
 *                       description: ID de la conversacion
 *                     messageId:
 *                       type: string
 *                       description: ID del mensaje creado
 *                     imageUrl:
 *                       type: string
 *                       description: URL temporal de la imagen analizada
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
 *                         imageSize:
 *                           type: string
 *                           example: 1024x768
 *                         imageFormat:
 *                           type: string
 *                           example: image/jpeg
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Error de validacion o formato de imagen invalido
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
 *                   example: Formato de imagen no soportado
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
  upload.single('image'),
  ...imageValidation,
  validate,
  asyncHandler(analyzeImage)
);

module.exports = router;