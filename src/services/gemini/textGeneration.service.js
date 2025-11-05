// src/services/gemini/textGeneration.service.js

const geminiClient = require('./geminiClient.service');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');
const logger = require('../../utils/logger');

class TextGenerationService {
  constructor() {
    this.maxPromptLength = 32000;
    this.defaultConfig = {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topK: 40,
      topP: 0.95
    };
  }

  /**
   * Valida la longitud del prompt
   * @param {string} prompt - Texto del prompt
   * @throws {Error} Si el prompt es muy largo
   */
  validatePromptLength(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('El prompt debe ser un texto valido');
    }

    if (prompt.length > this.maxPromptLength) {
      throw new Error(`El prompt excede el limite de ${this.maxPromptLength} caracteres`);
    }

    if (prompt.trim().length === 0) {
      throw new Error('El prompt no puede estar vacio');
    }

    return true;
  }

  /**
   * Genera texto con contexto academico
   * @param {Object} options - Opciones de generacion
   * @returns {Promise<Object>} - Resultado de la generacion
   */
  async generateText(options) {
    try {
      const { 
        prompt, 
        userId, 
        conversationId, 
        config = {},
        area = null,
        additionalContext = '',
        user = null
      } = options;

      this.validatePromptLength(prompt);

      logger.info('Iniciando generacion de texto', { 
        userId, 
        conversationId,
        area,
        promptLength: prompt.length 
      });

      let conversation;
      let isNewConversation = false;

      // Crear o obtener conversacion
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        
        if (!conversation) {
          throw new Error('Conversacion no encontrada');
        }
      } else {
        // Crear nueva conversacion academica
        conversation = await geminiClient.createAcademicConversation(
          userId,
          'Consulta Academica',
          area
        );
        isNewConversation = true;
      }

      // Generar respuesta con contexto academico
      const result = await geminiClient.generateWithHistory(
        conversation._id,
        prompt,
        userId,
        {
          area: area || conversation.metadata?.area,
          additionalContext,
          config: { ...this.defaultConfig, ...config },
          user
        }
      );

      logger.info('Texto generado exitosamente', {
        userId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        tokens: result.tokens.total,
        usingPersonalApiKey: result.metadata.usingPersonalApiKey
      });

      return {
        conversationId: result.conversationId,
        messageId: result.messageId,
        response: result.response,
        tokens: result.tokens,
        metadata: {
          ...result.metadata,
          isNewConversation,
          area: area || conversation.metadata?.area,
          academicMode: true
        }
      };
    } catch (error) {
      logger.error('Error en generateText:', error);
      throw error;
    }
  }

  /**
   * Genera texto con streaming y contexto academico
   * @param {Object} options - Opciones de generacion
   * @returns {Promise<Object>} - Stream y metadata
   */
  async generateTextStream(options) {
    try {
      const { 
        prompt, 
        userId, 
        conversationId, 
        config = {},
        area = null,
        additionalContext = '',
        user = null
      } = options;

      this.validatePromptLength(prompt);

      logger.info('Iniciando generacion con streaming', { 
        userId, 
        conversationId,
        area,
        promptLength: prompt.length 
      });

      let conversation;
      let isNewConversation = false;

      // Crear o obtener conversacion
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        
        if (!conversation) {
          throw new Error('Conversacion no encontrada');
        }
      } else {
        // Crear nueva conversacion academica
        conversation = await geminiClient.createAcademicConversation(
          userId,
          'Consulta Academica',
          area
        );
        isNewConversation = true;
      }

      // Obtener API key del usuario
      const apiKey = user ? geminiClient.getApiKeyForUser(user) : null;

      // Construir historial
      const history = await geminiClient.buildConversationHistory(conversation._id);

      // Inicializar modelo con contexto academico
      const model = geminiClient.initializeModel(
        {
          area: area || conversation.metadata?.area,
          additionalContext,
          config: { ...this.defaultConfig, ...config }
        },
        apiKey
      );

      // Iniciar chat con historial
      const chat = model.startChat({
        history: history,
        generationConfig: { ...this.defaultConfig, ...config }
      });

      // Guardar mensaje del usuario
      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: prompt,
        type: 'text',
        tokens: await geminiClient.countTokens(prompt)
      });

      // Obtener stream
      const stream = await chat.sendMessageStream(prompt);

      logger.info('Stream iniciado', {
        userId,
        conversationId: conversation._id,
        userMessageId: userMessage._id
      });

      return {
        stream,
        conversationId: conversation._id,
        userMessageId: userMessage._id,
        metadata: {
          isNewConversation,
          area: area || conversation.metadata?.area,
          academicMode: true,
          historyLength: history.length,
          usingPersonalApiKey: apiKey !== geminiClient.defaultApiKey
        }
      };
    } catch (error) {
      logger.error('Error en generateTextStream:', error);
      throw error;
    }
  }

  /**
   * Continua una conversacion existente con contexto academico
   * @param {Object} options - Opciones de continuacion
   * @returns {Promise<Object>} - Resultado de la generacion
   */
  async continueConversation(options) {
    try {
      const { 
        conversationId, 
        prompt, 
        userId, 
        config = {},
        area = null,
        additionalContext = '',
        user = null
      } = options;

      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      this.validatePromptLength(prompt);

      logger.info('Continuando conversacion', { 
        userId, 
        conversationId,
        promptLength: prompt.length 
      });

      // Verificar conversacion
      const conversation = await conversationService.getConversationById(
        conversationId, 
        userId
      );

      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      // Generar respuesta con contexto academico e historial
      const result = await geminiClient.generateWithHistory(
        conversationId,
        prompt,
        userId,
        {
          area: area || conversation.metadata?.area,
          additionalContext,
          config: { ...this.defaultConfig, ...config },
          user
        }
      );

      logger.info('Conversacion continuada exitosamente', {
        userId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        messageCount: result.metadata.totalMessages,
        tokens: result.tokens.total,
        usingPersonalApiKey: result.metadata.usingPersonalApiKey
      });

      return {
        conversationId: result.conversationId,
        messageId: result.messageId,
        response: result.response,
        tokens: result.tokens,
        metadata: {
          ...result.metadata,
          area: area || conversation.metadata?.area,
          academicMode: true
        }
      };
    } catch (error) {
      logger.error('Error en continueConversation:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Historial y metadata
   */
  async getConversationHistory(conversationId, userId) {
    try {
      logger.info('Obteniendo historial', { userId, conversationId });

      const conversation = await conversationService.getConversationById(
        conversationId,
        userId
      );

      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      const history = await geminiClient.buildConversationHistory(conversationId, 100);

      return {
        conversationId,
        title: conversation.title,
        area: conversation.metadata?.area,
        messageCount: history.length,
        history,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        metadata: conversation.metadata
      };
    } catch (error) {
      logger.error('Error obteniendo historial:', error);
      throw error;
    }
  }

  /**
   * Actualiza la configuracion de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @param {string} userId - ID del usuario
   * @param {Object} updates - Actualizaciones a aplicar
   * @returns {Promise<Object>} - Conversacion actualizada
   */
  async updateConversationConfig(conversationId, userId, updates) {
    try {
      logger.info('Actualizando config de conversacion', { 
        userId, 
        conversationId 
      });

      const conversation = await conversationService.getConversationById(
        conversationId,
        userId
      );

      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      const updatedConversation = await conversationService.updateConversation(
        conversationId,
        {
          metadata: {
            ...conversation.metadata,
            ...updates,
            updatedAt: new Date()
          }
        }
      );

      logger.info('Config actualizada', { conversationId });

      return {
        conversationId,
        metadata: updatedConversation.metadata
      };
    } catch (error) {
      logger.error('Error actualizando config:', error);
      throw error;
    }
  }

  /**
   * Estima los tokens de un texto
   * @param {string} text - Texto a estimar
   * @returns {Promise<number>} - Numero estimado de tokens
   */
  async estimateTokens(text) {
    try {
      return await geminiClient.countTokens(text);
    } catch (error) {
      logger.error('Error estimando tokens:', error);
      return geminiClient.estimateTokens(text);
    }
  }

  /**
   * Valida la configuracion de generacion
   * @param {Object} config - Configuracion a validar
   * @returns {Object} - Configuracion validada
   */
  validateConfig(config) {
    const validatedConfig = { ...this.defaultConfig };

    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || 
          config.temperature < 0 || 
          config.temperature > 2) {
        throw new Error('temperature debe estar entre 0 y 2');
      }
      validatedConfig.temperature = config.temperature;
    }

    if (config.maxOutputTokens !== undefined) {
      if (typeof config.maxOutputTokens !== 'number' || 
          config.maxOutputTokens < 1 || 
          config.maxOutputTokens > 8192) {
        throw new Error('maxOutputTokens debe estar entre 1 y 8192');
      }
      validatedConfig.maxOutputTokens = config.maxOutputTokens;
    }

    if (config.topK !== undefined) {
      if (typeof config.topK !== 'number' || config.topK < 1) {
        throw new Error('topK debe ser mayor a 0');
      }
      validatedConfig.topK = config.topK;
    }

    if (config.topP !== undefined) {
      if (typeof config.topP !== 'number' || 
          config.topP < 0 || 
          config.topP > 1) {
        throw new Error('topP debe estar entre 0 y 1');
      }
      validatedConfig.topP = config.topP;
    }

    return validatedConfig;
  }

  /**
   * Obtiene informacion del servicio
   * @returns {Object} - Informacion del servicio
   */
  getServiceInfo() {
    return {
      maxPromptLength: this.maxPromptLength,
      defaultConfig: this.defaultConfig,
      academicModeEnabled: true,
      modelInfo: geminiClient.getModelInfo()
    };
  }
}

module.exports = new TextGenerationService();