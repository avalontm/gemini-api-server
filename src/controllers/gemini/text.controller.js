// src/controllers/gemini/text.controller.js

const textGenerationService = require('../../services/gemini/textGeneration.service');
const streamResponseService = require('../../services/gemini/streamResponse.service');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

/**
 * Generar texto (respuesta completa)
 * @route   POST /api/gemini/text
 * @access  Private
 */
const generateText = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;

    logger.info('Generando texto', { 
      userId, 
      conversationId, 
      promptLength: prompt?.length 
    });

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'El prompt es requerido',
        timestamp: new Date().toISOString()
      });
    }

    const result = await textGenerationService.generateText({
      prompt,
      userId,
      conversationId,
      config
    });

    logger.info('Texto generado exitosamente', { 
      userId, 
      conversationId: result.conversationId,
      tokens: result.tokens.total 
    });

    res.status(200).json({
      success: true,
      message: 'Texto generado exitosamente',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generando texto:', error);
    next(error);
  }
};

/**
 * Generar texto con streaming (palabra por palabra)
 * @route   POST /api/gemini/text/stream
 * @access  Private
 */
const generateTextStream = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;

    logger.info('Iniciando generacion con streaming', { 
      userId, 
      conversationId,
      promptLength: prompt?.length 
    });

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'El prompt es requerido',
        timestamp: new Date().toISOString()
      });
    }

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let hasStarted = false;
    let currentConversationId = conversationId;

    try {
      // Use streamResponseService with callback
      const result = await streamResponseService.streamText({
        prompt,
        userId,
        conversationId,
        config: streamResponseService.validateStreamConfig(config || {}),
        onChunk: (data) => {
          // Send start event on first chunk
          if (!hasStarted) {
            hasStarted = true;
            currentConversationId = data.conversationId;
            
            res.write(`data: ${JSON.stringify({
              type: 'start',
              conversationId: data.conversationId,
              metadata: {
                model: 'gemini-pro',
                streamingMode: true
              },
              timestamp: new Date().toISOString()
            })}\n\n`);
          }

          // Send chunk event
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            text: data.chunk,
            timestamp: new Date().toISOString()
          })}\n\n`);
        }
      });

      logger.info('Streaming completado exitosamente', {
        userId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        chunks: result.chunks,
        tokens: result.tokens.total
      });

      // Send end event
      res.write(`data: ${JSON.stringify({
        type: 'end',
        messageId: result.messageId,
        conversationId: result.conversationId,
        tokens: result.tokens,
        fullText: result.response,
        chunks: result.chunks,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();

    } catch (streamError) {
      logger.error('Error procesando stream:', streamError);
      
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: streamError.message || 'Error procesando el stream',
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      res.end();
    }

  } catch (error) {
    logger.error('Error en generateTextStream:', error);
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message || 'Error generando texto con streaming',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando texto con streaming',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
};

/**
 * Continuar conversación existente
 * @route   POST /api/gemini/text/continue
 * @access  Private
 */
const continueConversation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;

    logger.info('Continuando conversacion', { 
      userId, 
      conversationId, 
      promptLength: prompt?.length 
    });

    if (!conversationId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId y prompt son requeridos',
        timestamp: new Date().toISOString()
      });
    }

    // Use the textGenerationService for non-streaming continuation
    const result = await textGenerationService.continueConversation({
      prompt,
      conversationId,
      userId,
      config
    });

    logger.info('Conversacion continuada exitosamente', {
      userId,
      conversationId,
      messageCount: result.metadata?.messageCount,
      tokens: result.tokens.total
    });

    res.status(200).json({
      success: true,
      message: 'Conversacion continuada exitosamente',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error continuando conversacion:', error);
    next(error);
  }
};

/**
 * Continuar conversación con streaming
 * @route   POST /api/gemini/text/continue/stream
 * @access  Private
 */
const continueConversationStream = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;

    logger.info('Continuando conversacion con streaming', { 
      userId, 
      conversationId,
      promptLength: prompt?.length 
    });

    if (!conversationId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId y prompt son requeridos',
        timestamp: new Date().toISOString()
      });
    }

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let hasStarted = false;

    try {
      const result = await streamResponseService.continueConversationStream({
        prompt,
        conversationId,
        userId,
        config: streamResponseService.validateStreamConfig(config || {}),
        onChunk: (data) => {
          if (!hasStarted) {
            hasStarted = true;
            
            res.write(`data: ${JSON.stringify({
              type: 'start',
              conversationId: data.conversationId,
              metadata: {
                model: 'gemini-pro',
                streamingMode: true,
                continuedConversation: true
              },
              timestamp: new Date().toISOString()
            })}\n\n`);
          }

          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            text: data.chunk,
            timestamp: new Date().toISOString()
          })}\n\n`);
        }
      });

      logger.info('Conversacion con streaming completada', {
        userId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        tokens: result.tokens.total
      });

      res.write(`data: ${JSON.stringify({
        type: 'end',
        messageId: result.messageId,
        conversationId: result.conversationId,
        tokens: result.tokens,
        fullText: result.response,
        chunks: result.chunks,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();

    } catch (streamError) {
      logger.error('Error en stream de continuacion:', streamError);
      
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: streamError.message || 'Error procesando el stream',
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      res.end();
    }

  } catch (error) {
    logger.error('Error continuando conversacion con streaming:', error);
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message || 'Error continuando conversacion',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({
        success: false,
        message: error.message || 'Error continuando conversacion con streaming',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
};

module.exports = {
  generateText,
  generateTextStream,
  continueConversation,
  continueConversationStream
};