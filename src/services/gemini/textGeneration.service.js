// src/controllers/gemini/text.controller.js

const textGenerationService = require('../../services/gemini/textGeneration.service');
const messageService = require('../../services/database/message.service');
const conversationService = require('../../services/database/conversation.service');
const geminiClient = require('../../services/gemini/geminiClient.service');

/**
 * Generar texto (respuesta completa)
 */
const generateText = async (req, res) => {
  try {
    const { prompt, conversationId, temperature, maxTokens } = req.body;
    const userId = req.user.id;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'El prompt es requerido'
      });
    }

    textGenerationService.validatePromptLength(prompt);

    const config = {
      temperature: temperature || 0.7,
      maxOutputTokens: maxTokens || 2048
    };

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
    console.error('Error en generateText:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando texto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generar texto con streaming (palabra por palabra)
 */
const generateTextStream = async (req, res) => {
  try {
    const { prompt, conversationId, temperature, maxTokens } = req.body;
    const userId = req.user.id;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'El prompt es requerido'
      });
    }

    textGenerationService.validatePromptLength(prompt);

    const config = {
      temperature: temperature || 0.7,
      maxOutputTokens: maxTokens || 2048
    };

    // Configurar headers para SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Para Nginx

    // Iniciar el stream
    const result = await textGenerationService.generateTextStream({
      prompt,
      userId,
      conversationId,
      config
    });

    const { stream, conversationId: convId, userMessageId, metadata } = result;

    // Enviar metadata inicial
    res.write(`data: ${JSON.stringify({
      type: 'start',
      conversationId: convId,
      userMessageId,
      metadata
    })}\n\n`);

    let fullText = '';

    // Procesar el stream
    for await (const chunk of stream.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;

      // Enviar cada chunk al cliente
      res.write(`data: ${JSON.stringify({
        type: 'chunk',
        text: chunkText
      })}\n\n`);
    }

    // Guardar el mensaje completo en la base de datos
    const assistantMessage = await messageService.createMessage({
      conversationId: convId,
      role: 'assistant',
      content: fullText,
      type: 'text',
      tokens: await geminiClient.countTokens(fullText)
    });

    await conversationService.addMessageToConversation(convId, assistantMessage._id);

    const userMessage = await messageService.getMessageById(userMessageId);
    const totalTokens = userMessage.tokens + assistantMessage.tokens;
    await conversationService.updateTokenUsage(convId, totalTokens);

    // Enviar mensaje final con metadata completa
    res.write(`data: ${JSON.stringify({
      type: 'end',
      messageId: assistantMessage._id,
      tokens: {
        prompt: userMessage.tokens,
        completion: assistantMessage.tokens,
        total: totalTokens
      },
      fullText
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('Error en generateTextStream:', error);
    
    // Enviar error a través del stream
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
    
    res.end();
  }
};

/**
 * Continuar conversación existente
 */
const continueConversation = async (req, res) => {
  try {
    const { conversationId, prompt, temperature, maxTokens } = req.body;
    const userId = req.user.id;

    if (!conversationId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId y prompt son requeridos'
      });
    }

    textGenerationService.validatePromptLength(prompt);

    const config = {
      temperature: temperature || 0.7,
      maxOutputTokens: maxTokens || 2048
    };

    const result = await textGenerationService.continueConversation({
      conversationId,
      prompt,
      userId,
      config
    });

    res.status(200).json({
      success: true,
      message: 'Conversacion continuada exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error en continueConversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error continuando conversacion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  generateText,
  generateTextStream,
  continueConversation
};