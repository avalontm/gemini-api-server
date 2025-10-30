// src/controllers/gemini/text.controller.js

const textGenerationService = require('../../services/gemini/textGeneration.service');
const streamResponseService = require('../../services/gemini/streamResponse.service');
const conversationService = require('../../services/database/conversation.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/gemini/text:
 *   post:
 *     summary: Generar texto con Gemini AI
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
 *                 example: Explica que es la inteligencia artificial
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               config:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     example: 0.7
 *                   maxOutputTokens:
 *                     type: number
 *                     example: 2048
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
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const generateText = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;

    const result = await textGenerationService.generateText({
      prompt,
      userId,
      conversationId,
      config
    });

    res.status(200).json({
      success: true,
      message: 'Texto generado exitosamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/text/stream:
 *   post:
 *     summary: Generar texto con streaming
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
 *                 example: Escribe un poema sobre el espacio
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Stream de texto
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const generateTextStream = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onChunk = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const result = await streamResponseService.streamText({
      prompt,
      userId,
      conversationId,
      onChunk,
      config
    });

    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      result 
    })}\n\n`);
    
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message 
    })}\n\n`);
    res.end();
  }
};

/**
 * @swagger
 * /api/gemini/text/continue:
 *   post:
 *     summary: Continuar una conversacion existente
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
 *               - conversationId
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Y que mas me puedes decir sobre eso?
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Conversacion continuada exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Conversacion no encontrada
 *       500:
 *         description: Error del servidor
 */
const continueConversation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;

    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    const result = await textGenerationService.continueConversation({
      prompt,
      conversationId,
      userId,
      config
    });

    res.status(200).json({
      success: true,
      message: 'Conversacion continuada exitosamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateText,
  generateTextStream,
  continueConversation
};