// src/routes/api/pdf.routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Middlewares - IMPORTACION CORRECTA CON DESTRUCTURING
const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { geminiLimiter } = require('../../middlewares/rateLimiter');
const { body, validationResult } = require('express-validator');

// Middleware de validacion local
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

// Importar controladores
const {
  analyzePDF,
  extractPDFText,
  summarizePDF,
  queryPDF
} = require('../../controllers/gemini/pdf.controller');

// Configuracion de multer para PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/pdfs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Validaciones
const pdfValidation = [
  body('prompt')
    .notEmpty()
    .withMessage('El prompt es requerido')
    .isString()
    .withMessage('El prompt debe ser un texto')
    .trim()
    .isLength({ min: 1, max: 6000 })
    .withMessage('El prompt debe tener entre 1 y 6000 caracteres'),
  
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('ID de conversacion invalido'),
  
  body('extractImages')
    .optional()
    .isBoolean()
    .withMessage('extractImages debe ser booleano'),
  
  body('pageRange')
    .optional()
    .isString()
    .matches(/^\d+-\d+$|^all$/)
    .withMessage('pageRange debe ser formato "1-5" o "all"')
];

/**
 * @swagger
 * /api/gemini/pdf:
 *   post:
 *     summary: Analizar documento PDF con Gemini
 *     description: Sube un archivo PDF para extraer su contenido y analizarlo
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
 *               - pdf
 *               - prompt
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *               prompt:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 6000
 *                 example: Resume los puntos principales de este documento
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: PDF analizado exitosamente
 *       400:
 *         description: Error de validacion
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/',
  authenticate,
  geminiLimiter,
  upload.single('pdf'),
  ...pdfValidation,
  validate,
  asyncHandler(analyzePDF)
);

/**
 * @swagger
 * /api/gemini/pdf/extract:
 *   post:
 *     summary: Extraer texto del PDF sin analisis
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
 *               - pdf
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Texto extraido exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/extract',
  authenticate,
  upload.single('pdf'),
  asyncHandler(extractPDFText)
);

/**
 * @swagger
 * /api/gemini/pdf/summarize:
 *   post:
 *     summary: Resumir documento PDF
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
 *               - pdf
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *               summaryLength:
 *                 type: string
 *                 enum: [short, medium, long]
 *                 default: medium
 *     responses:
 *       200:
 *         description: PDF resumido exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/summarize',
  authenticate,
  geminiLimiter,
  upload.single('pdf'),
  asyncHandler(summarizePDF)
);

/**
 * @swagger
 * /api/gemini/pdf/query:
 *   post:
 *     summary: Hacer preguntas sobre el PDF
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
 *               - pdf
 *               - questions
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *               questions:
 *                 type: string
 *                 example: "1. Cual es el tema principal? 2. Cuales son las conclusiones?"
 *     responses:
 *       200:
 *         description: Preguntas respondidas exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/query',
  authenticate,
  geminiLimiter,
  upload.single('pdf'),
  body('questions').notEmpty().isString().trim(),
  validate,
  asyncHandler(queryPDF)
);

module.exports = router;