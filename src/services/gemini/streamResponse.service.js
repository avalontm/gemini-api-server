// src/services/gemini/streamResponse.service.js

const geminiClient = require('./geminiClient.service');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');

class StreamResponseService {
  /**
   * Genera respuesta de texto en modo streaming
   * @param {Object} data - Datos para streaming
   * @param {string} data.prompt - Prompt de texto
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Function} data.onChunk - Callback para cada chunk recibido
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Respuesta completa y metadata
   */
  async streamText(data) {
    try {
      const { prompt, userId, conversationId, onChunk, config = {} } = data;

      if (!prompt || !userId) {
        throw new Error('prompt y userId son requeridos');
      }

      if (typeof onChunk !== 'function') {
        throw new Error('onChunk debe ser una funcion');
      }

      let conversation;
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
      }

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

      let fullResponse = '';
      let chunkCount = 0;

      const result = await geminiClient.generateContentStream(prompt, config);

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

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: fullResponse,
        type: 'text',
        tokens: await geminiClient.countTokens(fullResponse)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantMessage.tokens;
      await conversationService.updateTokenUsage(conversation._id, totalTokens);

      return {
        response: fullResponse,
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        chunks: chunkCount,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          streamingMode: true,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error en streaming de texto: ${error.message}`);
    }
  }

  /**
   * Genera respuesta multimodal en modo streaming
   * @param {Object} data - Datos para streaming multimodal
   * @param {string} data.prompt - Prompt de texto
   * @param {Array} data.files - Array de archivos (imagenes, etc)
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Function} data.onChunk - Callback para cada chunk recibido
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Respuesta completa y metadata
   */
  async streamMultimodal(data) {
    try {
      const { prompt, files, userId, conversationId, onChunk, config = {} } = data;

      if (!prompt || !userId) {
        throw new Error('prompt y userId son requeridos');
      }

      if (typeof onChunk !== 'function') {
        throw new Error('onChunk debe ser una funcion');
      }

      let conversation;
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
      }

      const parts = [{ text: prompt }];
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

      let fullResponse = '';
      let chunkCount = 0;

      const result = await geminiClient.generateMultimodalContentStream(parts, config);

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

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: fullResponse,
        type: 'multimodal',
        tokens: await geminiClient.countTokens(fullResponse)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantMessage.tokens;
      await conversationService.updateTokenUsage(conversation._id, totalTokens);

      return {
        response: fullResponse,
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        chunks: chunkCount,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          streamingMode: true,
          multimodal: true,
          attachmentCount: attachments.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error en streaming multimodal: ${error.message}`);
    }
  }

  /**
   * Continua una conversacion en modo streaming
   * @param {Object} data - Datos para continuar conversacion
   * @param {string} data.prompt - Nuevo prompt
   * @param {string} data.conversationId - ID de conversacion existente
   * @param {string} data.userId - ID del usuario
   * @param {Function} data.onChunk - Callback para cada chunk recibido
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Respuesta completa y metadata
   */
  async continueConversationStream(data) {
    try {
      const { prompt, conversationId, userId, onChunk, config = {} } = data;

      if (!prompt || !conversationId || !userId) {
        throw new Error('prompt, conversationId y userId son requeridos');
      }

      if (typeof onChunk !== 'function') {
        throw new Error('onChunk debe ser una funcion');
      }

      const conversation = await conversationService.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      const messages = await messageService.getMessagesByConversation(conversationId);
      
      const history = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

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

      let fullResponse = '';
      let chunkCount = 0;

      const result = await geminiClient.generateContentStreamWithHistory(
        prompt,
        history,
        config
      );

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

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: fullResponse,
        type: 'text',
        tokens: await geminiClient.countTokens(fullResponse)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantMessage.tokens;
      await conversationService.updateTokenUsage(conversation._id, totalTokens);

      return {
        response: fullResponse,
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        chunks: chunkCount,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          streamingMode: true,
          continuedConversation: true,
          messageCount: messages.length + 2,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error continuando conversacion en streaming: ${error.message}`);
    }
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