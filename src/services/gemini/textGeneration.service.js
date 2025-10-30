// src/services/gemini/textGeneration.service.js

const geminiClient = require('./geminiClient.service');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');

class TextGenerationService {
  /**
   * Genera texto a partir de un prompt
   * @param {Object} data - Datos de la generacion
   * @param {string} data.prompt - Prompt de texto
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Respuesta generada
   */
  async generateText(data) {
    try {
      const { prompt, userId, conversationId, config = {} } = data;

      if (!prompt || !userId) {
        throw new Error('prompt y userId son requeridos');
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
          tags: []
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

      const result = await geminiClient.generateContent(prompt, config);

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: result.text,
        type: 'text',
        tokens: await geminiClient.countTokens(result.text)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantMessage.tokens;
      await conversationService.updateTokenUsage(conversation._id, totalTokens);

      return {
        response: result.text,
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          temperature: config.temperature || 0.7,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error generando texto: ${error.message}`);
    }
  }

  /**
   * Genera texto con streaming
   * @param {Object} data - Datos de la generacion
   * @param {string} data.prompt - Prompt de texto
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Stream de respuesta
   */
  async generateTextStream(data) {
    try {
      const { prompt, userId, conversationId, config = {} } = data;

      if (!prompt || !userId) {
        throw new Error('prompt y userId son requeridos');
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
          tags: []
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

      const stream = await geminiClient.generateContentStream(prompt, config);

      return {
        stream,
        conversationId: conversation._id,
        userMessageId: userMessage._id,
        metadata: {
          model: geminiClient.model,
          temperature: config.temperature || 0.7
        }
      };
    } catch (error) {
      throw new Error(`Error generando texto stream: ${error.message}`);
    }
  }

  /**
   * Continua una conversacion existente
   * @param {Object} data - Datos de la continuacion
   * @param {string} data.conversationId - ID de la conversacion
   * @param {string} data.prompt - Nuevo prompt
   * @param {string} data.userId - ID del usuario
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Respuesta generada
   */
  async continueConversation(data) {
    try {
      const { conversationId, prompt, userId, config = {} } = data;

      if (!conversationId || !prompt || !userId) {
        throw new Error('conversationId, prompt y userId son requeridos');
      }

      const conversation = await conversationService.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      const messages = await messageService.getConversationMessages(conversationId);
      
      const history = messages.messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const chat = geminiClient.startChat(history, config);
      const result = await geminiClient.sendChatMessage(chat, prompt);

      const userMessage = await messageService.createMessage({
        conversationId,
        role: 'user',
        content: prompt,
        type: 'text',
        tokens: await geminiClient.countTokens(prompt)
      });

      await conversationService.addMessageToConversation(conversationId, userMessage._id);

      const assistantMessage = await messageService.createMessage({
        conversationId,
        role: 'assistant',
        content: result.text,
        type: 'text',
        tokens: await geminiClient.countTokens(result.text)
      });

      await conversationService.addMessageToConversation(conversationId, assistantMessage._id);

      const totalTokens = userMessage.tokens + assistantMessage.tokens;
      await conversationService.updateTokenUsage(conversationId, totalTokens);

      return {
        response: result.text,
        conversationId,
        messageId: assistantMessage._id,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          messageCount: messages.messages.length + 2,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error continuando conversacion: ${error.message}`);
    }
  }

  /**
   * Genera un titulo basado en el prompt
   * @param {string} prompt - Prompt original
   * @returns {string} - Titulo generado
   */
  generateTitle(prompt) {
    const maxLength = 50;
    let title = prompt.trim();

    if (title.length > maxLength) {
      title = title.substring(0, maxLength) + '...';
    }

    title = title.replace(/\n/g, ' ');
    
    return title || 'Nueva conversacion';
  }

  /**
   * Valida la longitud del prompt
   * @param {string} prompt - Prompt a validar
   * @param {number} maxLength - Longitud maxima
   * @returns {boolean} - true si es valido
   */
  validatePromptLength(prompt, maxLength = 10000) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt invalido');
    }

    if (prompt.length === 0) {
      throw new Error('El prompt no puede estar vacio');
    }

    if (prompt.length > maxLength) {
      throw new Error(`El prompt excede el limite de ${maxLength} caracteres`);
    }

    return true;
  }

  /**
   * Estima el costo de una generacion
   * @param {number} tokens - Numero de tokens
   * @returns {number} - Costo estimado en USD
   */
  estimateCost(tokens) {
    const costPerToken = 0.00005;
    return parseFloat((tokens * costPerToken).toFixed(4));
  }
}

module.exports = new TextGenerationService();