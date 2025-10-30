// src/routes/api/text.routes.js

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticate } = require('../../middlewares/auth/authenticate');
console.log('✓ authenticate importado:', typeof authenticate);

const { asyncHandler } = require('../../middlewares/asyncHandler');
console.log('✓ asyncHandler importado:', typeof asyncHandler);

const { geminiLimiter } = require('../../middlewares/rateLimiter');
console.log('✓ geminiLimiter importado:', typeof geminiLimiter);

const { body, validationResult } = require('express-validator');
console.log('✓ express-validator importado:', typeof body, typeof validationResult);

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
// const { generateText } = require('../../controllers/gemini/text.controller');

// Placeholder controller (reemplazar cuando se cree el real)
const generateText = (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'GenerateText controller pendiente de implementacion',
    receivedData: {
      prompt: req.body.prompt,
      conversationId: req.body.conversationId,
      temperature: req.body.temperature,
      maxTokens: req.body.maxTokens
    },
    user: {
      id: req.userId,
      email: req.user?.email
    }
  });
};

// Validacion para texto
const textValidation = [
  body('prompt')
    .notEmpty()
    .withMessage('El prompt es requerido')
    .isString()
    .withMessage('El prompt debe ser un texto')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('El prompt debe tener entre 1 y 10000 caracteres'),
  
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('ID de conversacion invalido'),
  
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature debe estar entre 0 y 2'),
  
  body('maxTokens')
    .optional()
    .isInt({ min: 1, max: 8192 })
    .withMessage('MaxTokens debe estar entre 1 y 8192')
];

/**
 * @swagger
 * /api/gemini/text:
 *   post:
 *     summary: Generar texto con Gemini
 *     description: Envia un prompt de texto a Gemini y recibe una respuesta generada
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Texto del prompt para generar respuesta
 *                 minLength: 1
 *                 maxLength: 10000
 *                 example: Explicame que es la inteligencia artificial
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
 *               maxTokens:
 *                 type: integer
 *                 description: Numero maximo de tokens en la respuesta
 *                 minimum: 1
 *                 maximum: 8192
 *                 default: 2048
 *                 example: 2048
 *     responses:
 *       200:
 *         description: Texto generado exitosamente
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
 *                       description: Texto generado por Gemini
 *                     conversationId:
 *                       type: string
 *                       description: ID de la conversacion
 *                     messageId:
 *                       type: string
 *                       description: ID del mensaje creado
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         prompt:
 *                           type: integer
 *                           description: Tokens usados en el prompt
 *                         completion:
 *                           type: integer
 *                           description: Tokens usados en la respuesta
 *                         total:
 *                           type: integer
 *                           description: Total de tokens usados
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         model:
 *                           type: string
 *                           example: gemini-1.5-flash
 *                         temperature:
 *                           type: number
 *                           example: 0.7
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Error de validacion en los datos enviados
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
 *                       message:
 *                         type: string
 *       401:
 *         description: No autorizado - Token invalido o expirado
 *       429:
 *         description: Demasiadas peticiones - Rate limit excedido
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/',
  authenticate,
  geminiLimiter,
  ...textValidation,  // Spread operator para expandir el array
  validate,
  asyncHandler(generateText)
);

module.exports = router;