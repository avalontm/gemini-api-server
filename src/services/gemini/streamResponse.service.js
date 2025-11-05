// src/services/gemini/streamResponse.service.js

const geminiClient = require('./geminiClient.service');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');
const logger = require('../../utils/logger');

class StreamResponseService {
  /**
   * Genera respuesta de texto en modo streaming CON HISTORIAL
   * @param {Object} data - Datos para streaming
   * @param {string} data.prompt - Prompt de texto
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Function} data.onChunk - Callback para cada chunk recibido
   * @param {Object} data.config - Configuracion opcional
   * @param {Object} data.user - Usuario completo (opcional)
   * @returns {Promise<Object>} - Respuesta completa y metadata
   */
  async streamText(data) {
    try {
      const { prompt, userId, conversationId, onChunk, config = {}, user = null } = data;

      if (!prompt || !userId) {
        throw new Error('prompt y userId son requeridos');
      }

      if (typeof onChunk !== 'function') {
        throw new Error('onChunk debe ser una funcion');
      }

      logger.info('Iniciando streaming de texto con historial', {
        userId,
        conversationId,
        promptLength: prompt.length
      });

      let conversation;
      let isNewConversation = false;

      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          throw new Error('Conversacion no encontrada');
        }
      } else {
        const title = this.generateTitle(prompt);
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['text', 'streaming']
        });
        isNewConversation = true;
      }

      // Guardar mensaje del usuario
      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: prompt,
        type: 'text',
        tokens: await geminiClient.countTokens(prompt)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        userMessage._id
      );

      // Obtener API key del usuario
      const apiKey = user ? geminiClient.getApiKeyForUser(user) : null;

      // Obtener historial
      const history = await geminiClient.buildConversationHistory(conversation._id);

      // Inicializar modelo
      const model = geminiClient.initializeModel({ config }, apiKey);

      // Iniciar chat con historial
      const chat = model.startChat({
        history: history,
        generationConfig: config
      });

      logger.info('Chat de texto iniciado con historial', {
        conversationId: conversation._id,
        historyLength: history.length
      });

      // Obtener stream
      const result = await chat.sendMessageStream(prompt);

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        chunkCount++;

        onChunk({
          chunk: chunkText,
          accumulated: fullResponse,
          chunkNumber: chunkCount,
          conversationId: conversation._id
        });
      }

      // Obtener respuesta final
      const finalResponse = await result.response;
      const assistantTokens = finalResponse.usageMetadata?.candidatesTokenCount || 
                              finalResponse.usageMetadata?.totalTokenCount || 
                              await geminiClient.countTokens(fullResponse);

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: fullResponse,
        type: 'text',
        tokens: assistantTokens
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantTokens;
      await conversationService.updateTokenUsage(conversation._id, assistantTokens);

      logger.info('Streaming de texto completado', {
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        chunks: chunkCount,
        tokens: totalTokens
      });

      return {
        response: fullResponse,
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        chunks: chunkCount,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantTokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          streamingMode: true,
          historyLength: history.length,
          totalMessages: history.length + 2,
          isNewConversation,
          usingPersonalApiKey: apiKey !== geminiClient.defaultApiKey,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Error en streaming de texto:', error);
      throw new Error(`Error en streaming de texto: ${error.message}`);
    }
  }

  /**
   * Genera respuesta multimodal en modo streaming CON HISTORIAL
   * @param {Object} data - Datos para streaming multimodal
   * @param {string} data.prompt - Prompt de texto
   * @param {Array} data.files - Array de archivos (imagenes, etc)
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Function} data.onChunk - Callback para cada chunk recibido
   * @param {Object} data.config - Configuracion opcional
   * @param {Object} data.user - Usuario completo (opcional)
   * @returns {Promise<Object>} - Respuesta completa y metadata
   */
  async streamMultimodal(data) {
    try {
      const { prompt, files, userId, conversationId, onChunk, config = {}, user = null } = data;

      if (!prompt || !userId) {
        throw new Error('prompt y userId son requeridos');
      }

      if (typeof onChunk !== 'function') {
        throw new Error('onChunk debe ser una funcion');
      }

      logger.info('Iniciando streaming multimodal con historial', {
        userId,
        conversationId,
        filesCount: files ? files.length : 0
      });

      let conversation;
      let isNewConversation = false;

      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          throw new Error('Conversacion no encontrada');
        }
      } else {
        const title = this.generateTitle(prompt);
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', 'streaming']
        });
        isNewConversation = true;
      }

      const parts = [];
      const attachments = [];

      if (files && Array.isArray(files) && files.length > 0) {
        for (const file of files) {
          parts.push(file.part);
          attachments.push({
            type: file.type || 'image',
            url: file.path,
            name: file.name
          });
        }
      }

      if (prompt) {
        parts.push({ text: prompt });
      }

      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: prompt,
        type: 'multimodal',
        attachments,
        tokens: await geminiClient.countTokens(prompt)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        userMessage._id
      );

      // Obtener API key del usuario
      const apiKey = user ? geminiClient.getApiKeyForUser(user) : null;

      // Obtener historial
      const history = await geminiClient.buildConversationHistory(conversation._id);

      // Inicializar modelo
      const model = geminiClient.initializeModel({ config }, apiKey);

      // Iniciar chat con historial
      const chat = model.startChat({
        history: history,
        generationConfig: config
      });

      logger.info('Chat multimodal iniciado con historial', {
        conversationId: conversation._id,
        historyLength: history.length
      });

      // Obtener stream
      const result = await chat.sendMessageStream(parts);

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        chunkCount++;

        onChunk({
          chunk: chunkText,
          accumulated: fullResponse,
          chunkNumber: chunkCount,
          conversationId: conversation._id
        });
      }

      // Obtener respuesta final
      const finalResponse = await result.response;
      const assistantTokens = finalResponse.usageMetadata?.candidatesTokenCount || 
                              finalResponse.usageMetadata?.totalTokenCount || 
                              await geminiClient.countTokens(fullResponse);

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: fullResponse,
        type: 'multimodal',
        tokens: assistantTokens
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantTokens;
      await conversationService.updateTokenUsage(conversation._id, assistantTokens);

      logger.info('Streaming multimodal completado', {
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        chunks: chunkCount,
        tokens: totalTokens
      });

      return {
        response: fullResponse,
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        chunks: chunkCount,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantTokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          streamingMode: true,
          multimodal: true,
          attachmentCount: attachments.length,
          historyLength: history.length,
          totalMessages: history.length + 2,
          isNewConversation,
          usingPersonalApiKey: apiKey !== geminiClient.defaultApiKey,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Error en streaming multimodal:', error);
      throw new Error(`Error en streaming multimodal: ${error.message}`);
    }
  }

  /**
   * Continua una conversacion en modo streaming (DEPRECADO - usar streamText o streamMultimodal)
   * Este metodo se mantiene por compatibilidad pero ahora streamText ya incluye historial automaticamente
   * @param {Object} data - Datos para continuar conversacion
   * @returns {Promise<Object>} - Respuesta completa y metadata
   */
  async continueConversationStream(data) {
    logger.warn('continueConversationStream esta deprecado. Use streamText que ya incluye historial automaticamente');
    
    // Simplemente redirigir a streamText que ahora maneja historial
    return this.streamText(data);
  }

  /**
   * Genera titulo automatico basado en el prompt
   * @param {string} prompt - Prompt del usuario
   * @returns {string} - Titulo generado
   */
  generateTitle(prompt) {
    const maxLength = 50;
    const cleaned = prompt.trim().replace(/\n/g, ' ');
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  /**
   * Valida configuracion de streaming
   * @param {Object} config - Configuracion a validar
   * @returns {Object} - Configuracion validada
   */
  validateStreamConfig(config) {
    const defaultConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    };

    return {
      ...defaultConfig,
      ...config
    };
  }

  /**
   * Cancela un stream en progreso
   * @param {Object} streamController - Controlador del stream
   */
  cancelStream(streamController) {
    if (streamController && typeof streamController.abort === 'function') {
      streamController.abort();
    }
  }
}

module.exports = new StreamResponseService();