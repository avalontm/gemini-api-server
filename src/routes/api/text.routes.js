// src/routes/api/text.routes.js

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { textQueryValidation } = require('../../middlewares/validation');
const { geminiLimiter } = require('../../middlewares/rateLimiter');

const { 
  generateText, 
  generateTextStream,
  continueConversation,
  continueConversationStream
} = require('../../controllers/gemini/text.controller');

/**
 * @swagger
 * /api/gemini/text:
 *   post:
 *     summary: Generar texto con Gemini AI (respuesta completa)
 *     tags: [Gemini - Text Generation]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  geminiLimiter,
  textQueryValidation,
  asyncHandler(generateText)
);

/**
 * @swagger
 * /api/gemini/text/stream:
 *   post:
 *     summary: Generar texto con streaming (palabra por palabra)
 *     tags: [Gemini - Text Generation]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/stream',
  authenticate,
  geminiLimiter,
  textQueryValidation,
  asyncHandler(generateTextStream)
);

/**
 * @swagger
 * /api/gemini/text/continue:
 *   post:
 *     summary: Continuar una conversación existente
 *     tags: [Gemini - Text Generation]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/continue',
  authenticate,
  geminiLimiter,
  textQueryValidation,
  asyncHandler(continueConversation)
);

/**
 * @swagger
 * /api/gemini/text/continue/stream:
 *   post:
 *     summary: Continuar conversación con streaming
 *     description: Continúa una conversación existente con streaming en tiempo real
 *     tags: [Gemini - Text Generation]
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
 *               - conversationId
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: El nuevo mensaje
 *                 example: Y qué más me puedes decir?
 *               conversationId:
 *                 type: string
 *                 description: ID de la conversación
 *                 example: 507f1f77bcf86cd799439011
 *               config:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     example: 0.7
 *     responses:
 *       200:
 *         description: Stream iniciado (Server-Sent Events)
 */
router.post(
  '/continue/stream',
  authenticate,
  geminiLimiter,
  textQueryValidation,
  asyncHandler(continueConversationStream)
);

module.exports = router;