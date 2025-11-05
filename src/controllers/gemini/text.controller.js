// src/controllers/gemini/text.controller.js

const textGenerationService = require('../../services/gemini/textGeneration.service');
const messageService = require('../../services/database/message.service');
const conversationService = require('../../services/database/conversation.service');
const geminiClient = require('../../services/gemini/geminiClient.service');
const markdownProcessor = require('../../services/utils/markdownProcessor.service');
const logger = require('../../utils/logger');

/**
 * Generar texto (respuesta completa) con contexto academico
 */
const generateText = async (req, res) => {
  try {
    const { 
      prompt, 
      conversationId, 
      temperature, 
      maxTokens,
      area,
      additionalContext 
    } = req.body;
    const userId = req.user.id;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'El prompt es requerido',
        timestamp: new Date().toISOString()
      });
    }

    textGenerationService.validatePromptLength(prompt);

    const config = {
      temperature: temperature || 0.7,
      maxOutputTokens: maxTokens || 2048
    };

    logger.info('Generando texto academico', {
      userId,
      conversationId,
      area,
      promptLength: prompt.length
    });

    const result = await textGenerationService.generateText({
      prompt,
      userId,
      conversationId,
      config,
      area,
      additionalContext,
      user: req.user
    });

    // POST-PROCESAR el contenido markdown
    const processedResponse = markdownProcessor.process(result.response);
    
    // Actualizar el mensaje en la base de datos con el contenido procesado
    if (result.messageId) {
      await messageService.updateMessage(result.messageId, {
        content: processedResponse
      });
    }

    logger.info('Texto generado y procesado exitosamente', {
      userId,
      conversationId: result.conversationId,
      tokens: result.tokens.total,
      usingPersonalApiKey: result.metadata.usingPersonalApiKey,
      contentProcessed: true
    });

    res.status(200).json({
      success: true,
      message: 'Texto generado exitosamente',
      data: {
        ...result,
        response: processedResponse
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error en generateText:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando texto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Generar texto con streaming (palabra por palabra) con contexto academico
 */
const generateTextStream = async (req, res) => {
  try {
    const { 
      prompt, 
      conversationId, 
      temperature, 
      maxTokens,
      area,
      additionalContext 
    } = req.body;
    const userId = req.user.id;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'El prompt es requerido',
        timestamp: new Date().toISOString()
      });
    }

    textGenerationService.validatePromptLength(prompt);

    const config = {
      temperature: temperature || 0.7,
      maxOutputTokens: maxTokens || 2048
    };

    logger.info('Iniciando generacion con streaming academico', {
      userId,
      conversationId,
      area,
      promptLength: prompt.length
    });

    // Configurar headers para SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Iniciar el stream
    const result = await textGenerationService.generateTextStream({
      prompt,
      userId,
      conversationId,
      config,
      area,
      additionalContext,
      user: req.user
    });

    const { 
      stream, 
      conversationId: convId, 
      userMessageId, 
      metadata 
    } = result;

    // Enviar metadata inicial
    res.write(`data: ${JSON.stringify({
      type: 'start',
      conversationId: convId,
      userMessageId,
      metadata: {
        ...metadata,
        model: 'gemini-academic',
        academicMode: true
      },
      timestamp: new Date().toISOString()
    })}\n\n`);

    let fullText = '';
    let chunkCount = 0;

    // Procesar el stream
    for await (const chunk of stream.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      chunkCount++;

      // Enviar cada chunk al cliente SIN procesar (durante streaming)
      res.write(`data: ${JSON.stringify({
        type: 'chunk',
        text: chunkText,
        chunkNumber: chunkCount,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }

    // Obtener respuesta final para tokens
    const finalResponse = await stream.response;
    const assistantTokens = finalResponse.usageMetadata?.candidatesTokenCount || 
                            finalResponse.usageMetadata?.totalTokenCount || 
                            await geminiClient.countTokens(fullText);

    // POST-PROCESAR el contenido completo al finalizar streaming
    const processedFullText = markdownProcessor.processStreamComplete(fullText);

    logger.info('Contenido procesado despues de streaming', {
      originalLength: fullText.length,
      processedLength: processedFullText.length,
      chunks: chunkCount
    });

    // Guardar el mensaje procesado en la base de datos
    const assistantMessage = await messageService.createMessage({
      conversationId: convId,
      role: 'assistant',
      content: processedFullText,
      type: 'text',
      tokens: assistantTokens
    });

    await conversationService.addMessageToConversation(convId, assistantMessage._id);

    const userMessage = await messageService.getMessageById(userMessageId);
    const totalTokens = (userMessage.tokens || 0) + assistantTokens;
    await conversationService.updateTokenUsage(convId, assistantTokens);

    logger.info('Streaming completado exitosamente', {
      userId,
      conversationId: convId,
      messageId: assistantMessage._id,
      chunks: chunkCount,
      tokens: totalTokens,
      usingPersonalApiKey: metadata.usingPersonalApiKey,
      contentProcessed: true
    });

    // Enviar mensaje final con contenido procesado
    res.write(`data: ${JSON.stringify({
      type: 'end',
      messageId: assistantMessage._id,
      conversationId: convId,
      tokens: {
        prompt: userMessage.tokens || 0,
        completion: assistantTokens,
        total: totalTokens
      },
      fullText: processedFullText,
      chunks: chunkCount,
      metadata: metadata,
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();
  } catch (error) {
    logger.error('Error en generateTextStream:', error);
    
    // Enviar error a través del stream
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    res.end();
  }
};

/**
 * Continuar conversacion existente con contexto academico
 */
const continueConversation = async (req, res) => {
  try {
    const { 
      conversationId, 
      prompt, 
      temperature, 
      maxTokens,
      area,
      additionalContext 
    } = req.body;
    const userId = req.user.id;

    if (!conversationId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId y prompt son requeridos',
        timestamp: new Date().toISOString()
      });
    }

    textGenerationService.validatePromptLength(prompt);

    const config = {
      temperature: temperature || 0.7,
      maxOutputTokens: maxTokens || 2048
    };

    logger.info('Continuando conversacion academica', {
      userId,
      conversationId,
      promptLength: prompt.length
    });

    const result = await textGenerationService.continueConversation({
      conversationId,
      prompt,
      userId,
      config,
      area,
      additionalContext,
      user: req.user
    });

    // POST-PROCESAR el contenido markdown
    const processedResponse = markdownProcessor.process(result.response);
    
    // Actualizar el mensaje en la base de datos con el contenido procesado
    if (result.messageId) {
      await messageService.updateMessage(result.messageId, {
        content: processedResponse
      });
    }

    logger.info('Conversacion continuada y procesada exitosamente', {
      userId,
      conversationId: result.conversationId,
      messageCount: result.metadata.totalMessages,
      tokens: result.tokens.total,
      usingPersonalApiKey: result.metadata.usingPersonalApiKey,
      contentProcessed: true
    });

    res.status(200).json({
      success: true,
      message: 'Conversacion continuada exitosamente',
      data: {
        ...result,
        response: processedResponse
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error en continueConversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error continuando conversacion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  generateText,
  generateTextStream,
  continueConversation
};