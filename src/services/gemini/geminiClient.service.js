// src/services/gemini/geminiClient.service.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { 
  ACADEMIC_SYSTEM_INSTRUCTIONS, 
  DEFAULT_ACADEMIC_CONFIG,
  AREA_SPECIFIC_CONTEXTS,
  enhancePrompt  // ← AGREGAR ESTA IMPORTACIÓN
} = require('../../config/academicContext.config');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');
const logger = require('../../utils/logger');

class GeminiClientService {
  constructor() {
    this.defaultApiKey = process.env.GEMINI_API_KEY;
    this.defaultModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash'; 
    
    if (!this.defaultApiKey) {
      console.warn('ADVERTENCIA: GEMINI_API_KEY no esta configurada en las variables de entorno');
    }

    // Ya no necesitas este if porque ya tiene fallback arriba
    // Pero si quieres doble seguridad:
    if (!this.defaultModel) {
      console.warn('ADVERTENCIA: GEMINI_MODEL no configurado, usando gemini-2.0-flash por defecto');
      this.defaultModel = 'gemini-2.0-flash';
    }

    logger.info('GeminiClientService inicializado', {
      modeloDefault: this.defaultModel,
      hasApiKey: !!this.defaultApiKey
    });

    // Cache de clientes por API key (para optimizar)
    this.clientCache = new Map();
  }

  /**
   * Obtiene o crea un cliente de Gemini para una API key especifica
   * @param {string} apiKey - API key a usar (opcional, usa la del servidor por defecto)
   * @returns {GoogleGenerativeAI} - Cliente de Gemini
   */
  getClient(apiKey = null) {
    const keyToUse = apiKey || this.defaultApiKey;
    
    if (!keyToUse) {
      throw new Error('No hay API key disponible. Configure GEMINI_API_KEY o proporcione una API key personal');
    }

    // Verificar si ya existe en cache
    if (this.clientCache.has(keyToUse)) {
      return this.clientCache.get(keyToUse);
    }

    // Crear nuevo cliente y guardarlo en cache
    const client = new GoogleGenerativeAI(keyToUse);
    this.clientCache.set(keyToUse, client);

    // Limitar el tamano del cache (maximo 50 clientes)
    if (this.clientCache.size > 50) {
      const firstKey = this.clientCache.keys().next().value;
      this.clientCache.delete(firstKey);
    }

    return client;
  }

  /**
   * Obtiene la API key apropiada para un usuario
   * @param {Object} user - Usuario de Mongoose
   * @returns {string|null} - API key a usar
   */
  getApiKeyForUser(user) {
    if (!user) {
      logger.info('Sin usuario, usando API key del servidor');
      return this.defaultApiKey;
    }

    if (typeof user.getGeminiApiKey === 'function') {
      const apiKey = user.getGeminiApiKey();
      
      // LOG TEMPORAL PARA DEBUGGING
      const isServerKey = apiKey === this.defaultApiKey;
      const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'null';
      
      logger.info(`API Key seleccionada: ${maskedKey} (${isServerKey ? 'SERVIDOR' : 'PERSONAL'})`, {
        userId: user._id || user.id,
        usePersonalApiKey: user.preferences?.usePersonalApiKey
      });
      
      return apiKey;
    }

    logger.info('Usando API key del servidor (fallback)');
    return this.defaultApiKey;
  }

 /**
   * Obtiene el modelo apropiado para un usuario
   * @param {Object} user - Usuario de Mongoose
   * @returns {string} - Modelo a usar
   */
  getModelForUser(user) {
    if (!user) {
      logger.info('Sin usuario, usando modelo del servidor');
      return this.defaultModel;
    }

    if (typeof user.getGeminiModel === 'function') {
      const userModel = user.getGeminiModel();
      
      if (userModel) {
        logger.info(`Usando modelo personal del usuario: ${userModel}`, {
          userId: user._id || user.id,
          usePersonalModel: user.preferences?.usePersonalModel
        });
        return userModel;
      }
    }

    logger.info(`Usando modelo del servidor: ${this.defaultModel}`);
    return this.defaultModel;
  }

  /**
   * Inicializa el modelo generativo con contexto academico
   * @param {Object} options - Opciones de configuracion
   * @param {string} apiKey - API key a usar (opcional)
   * @param {string} modelName - Nombre del modelo (opcional)
   * @returns {Object} - Modelo generativo
   */
  initializeModel(options = {}, apiKey = null, modelName = null) {
    try {
      const client = this.getClient(apiKey);
      
      const {
        systemInstruction = ACADEMIC_SYSTEM_INSTRUCTIONS,
        area = null,
        additionalContext = '',
        config = {}
      } = options;

      // Usar el modelo especificado o el por defecto
      const modelToUse = modelName || this.defaultModel;

      // Construir instrucciones completas
      let fullInstructions = systemInstruction;
      
      if (area && AREA_SPECIFIC_CONTEXTS[area]) {
        fullInstructions += '\n\n' + AREA_SPECIFIC_CONTEXTS[area];
        logger.info('Agregando contexto especifico de area', { area });
      }
      
      if (additionalContext) {
        fullInstructions += '\n\nCONTEXTO ADICIONAL:\n' + additionalContext;
        logger.info('Agregando contexto adicional', { 
          contextLength: additionalContext.length 
        });
      }

      logger.info('Inicializando modelo con instrucciones academicas', {
        model: modelToUse, 
        area: area || 'general',
        hasAdditionalContext: !!additionalContext,
        instructionsLength: fullInstructions.length,
        temperature: config.temperature || DEFAULT_ACADEMIC_CONFIG.temperature,
        maxOutputTokens: config.maxOutputTokens || DEFAULT_ACADEMIC_CONFIG.maxOutputTokens
      });

      const modelConfig = {
        model: modelToUse, // ← Usar el modelo correcto
        systemInstruction: fullInstructions,
        generationConfig: {
          temperature: config.temperature || DEFAULT_ACADEMIC_CONFIG.temperature,
          topK: config.topK || DEFAULT_ACADEMIC_CONFIG.topK,
          topP: config.topP || DEFAULT_ACADEMIC_CONFIG.topP,
          maxOutputTokens: config.maxOutputTokens || DEFAULT_ACADEMIC_CONFIG.maxOutputTokens,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ]
      };

      logger.info('Modelo inicializado exitosamente', {
        model: modelToUse,
        configApplied: true
      });

      return client.getGenerativeModel(modelConfig);
    } catch (error) {
      logger.error('Error inicializando modelo:', error);
      throw new Error(`Error inicializando modelo: ${error.message}`);
    }
  }

  /**
   * Obtiene el modelo generativo (metodo legado, mantener compatibilidad)
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Object} - Modelo generativo
   */
  getModel(config = {}, apiKey = null) {
    return this.initializeModel({ config }, apiKey);
  }

  /**
   * Construir historial de conversacion para Gemini
   * @param {string} conversationId - ID de la conversacion
   * @param {number} maxMessages - Maximo de mensajes a incluir
   * @returns {Promise<Array>} - Historial formateado
   */
  async buildConversationHistory(conversationId, maxMessages = 20) {
    try {
      const messages = await messageService.getMessagesByConversation(
        conversationId,
        { limit: maxMessages, sort: { createdAt: 1 } }
      );

      // Convertir al formato de Gemini
      const history = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      logger.info('Historial construido', { 
        conversationId, 
        messagesCount: history.length 
      });

      return history;
    } catch (error) {
      logger.error('Error construyendo historial:', error);
      return [];
    }
  }

  /**
   * Genera contenido con contexto academico
   * @param {string} prompt - Texto del prompt
   * @param {Object} options - Opciones de configuracion
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Promise<Object>} - Respuesta generada
   */
  async generateContent(prompt, options = {}, apiKey = null) {
    try {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt invalido');
      }

      const model = this.initializeModel(options, apiKey);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return {
        text,
        tokens: {
          prompt: response.usageMetadata?.promptTokenCount || 0,
          completion: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        response: response,
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP'
      };
    } catch (error) {
      logger.error('Error generando contenido:', error);
      throw new Error(`Error generando contenido: ${error.message}`);
    }
  }

  /**
   * Genera respuesta con historial de conversacion
   * @param {string} conversationId - ID de la conversacion
   * @param {string} prompt - Texto del prompt
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de configuracion
   * @returns {Promise<Object>} - Respuesta generada
   */
 async generateWithHistory(conversationId, prompt, userId, options = {}) {
    try {
      const user = options.user || null;
      const apiKey = user ? this.getApiKeyForUser(user) : this.defaultApiKey;
      const modelName = user ? this.getModelForUser(user) : this.defaultModel; // ← NUEVO

      const model = this.initializeModel(options, apiKey, modelName); // ← Pasar modelo
      
      // ... resto del código igual ...
      
      return {
        conversationId,
        messageId: assistantMessage._id,
        response: text,
        tokens: {
          prompt: response.usageMetadata?.promptTokenCount || 0,
          completion: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        metadata: {
          historyLength: history.length,
          totalMessages: history.length + 2,
          usingPersonalApiKey: apiKey !== this.defaultApiKey,
          usingPersonalModel: modelName !== this.defaultModel, // ← NUEVO
          model: modelName // ← NUEVO
        }
      };
    } catch (error) {
      logger.error('Error generando con historial:', error);
      throw error;
    }
  }

  /**
   * Genera respuesta con streaming y historial
   * @param {string} conversationId - ID de la conversacion
   * @param {string} prompt - Texto del prompt
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de configuracion
   * @returns {Promise<Object>} - Respuesta generada con streaming
   */
  async streamWithHistory(conversationId, prompt, userId, options = {}) {
    try {
      const user = options.user || null;
      const apiKey = user ? this.getApiKeyForUser(user) : this.defaultApiKey;
      const modelName = user ? this.getModelForUser(user) : this.defaultModel; // ← NUEVO

      const model = this.initializeModel(options, apiKey, modelName); // ← Pasar modelo
      
      // ... resto del código igual ...
      
      return {
        conversationId,
        messageId: assistantMessage._id,
        response: fullText,
        chunks,
        tokens: {
          prompt: finalResponse.usageMetadata?.promptTokenCount || 0,
          completion: finalResponse.usageMetadata?.candidatesTokenCount || 0,
          total: finalResponse.usageMetadata?.totalTokenCount || 0
        },
        metadata: {
          historyLength: history.length,
          totalMessages: history.length + 2,
          usingPersonalApiKey: apiKey !== this.defaultApiKey,
          usingPersonalModel: modelName !== this.defaultModel, // ← NUEVO
          model: modelName // ← NUEVO
        }
      };
    } catch (error) {
      logger.error('Error en streaming con historial:', error);
      throw error;
    }
  }

  /**
   * Crear nueva conversacion academica
   * @param {string} userId - ID del usuario
   * @param {string} title - Titulo de la conversacion
   * @param {string} area - Area academica (opcional)
   * @returns {Promise<Object>} - Conversacion creada
   */
  async createAcademicConversation(userId, title, area = null) {
    try {
      const conversation = await conversationService.createConversation({
        userId,
        title: title || 'Nueva Consulta Academica',
        tags: ['academico', area].filter(Boolean),
        metadata: {
          area: area,
          academicMode: true,
          createdBy: 'academic-assistant'
        }
      });

      logger.info('Conversacion academica creada', { 
        conversationId: conversation._id || conversation.id,
        area 
      });

      return conversation;
    } catch (error) {
      logger.error('Error creando conversacion academica:', error);
      throw error;
    }
  }

  // ============================================
  // MÉTODOS PARA MANEJO DE IMÁGENES
  // ============================================

  /**
   * Limpia base64 removiendo el prefijo data URL
   * @param {string} dataUrl - String base64 (puede incluir data:image/...)
   * @returns {string} - Base64 limpio
   */
  cleanBase64(dataUrl) {
    if (!dataUrl) return null;
    
    // Remover "data:image/png;base64," si existe
    if (dataUrl.includes('base64,')) {
      return dataUrl.split('base64,')[1];
    }
    
    return dataUrl;
  }

  /**
   * Detecta el MIME type desde un data URL o nombre de archivo
   * @param {string} dataUrl - Data URL o base64
   * @param {string} filename - Nombre del archivo (opcional)
   * @returns {string} - MIME type detectado
   */
  getMimeType(dataUrl, filename = '') {
    // Si es data URL, extraer mime type
    if (dataUrl && dataUrl.startsWith('data:')) {
      const match = dataUrl.match(/data:([^;]+);/);
      if (match) return match[1];
    }
    
    // Detectar por extensión de archivo
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'pdf': 'application/pdf'
      };
      
      if (mimeTypes[ext]) return mimeTypes[ext];
    }
    
    // Default
    return 'image/jpeg';
  }

  /**
   * Construye las partes del mensaje con texto e imágenes
   * @param {string} prompt - Texto del usuario
   * @param {Array} images - Array de imágenes
   * @returns {Array} - Array de parts para Gemini
   */
  buildMultimodalParts(prompt, images = []) {
    const parts = [];
    
    // IMPORTANTE: Mejorar el prompt con recordatorios contextuales
    const enhancedPrompt = enhancePrompt(prompt, {
      hasFiles: images && images.length > 0,
      fileCount: images ? images.length : 0,
      forceComparison: images && images.length > 1
    });
    
    // Agregar texto primero (mejorado)
    if (enhancedPrompt && enhancedPrompt.trim()) {
      parts.push({
        text: enhancedPrompt
      });
    }
    
    // Agregar imágenes
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        try {
          let imageData, mimeType;
          
          if (typeof image === 'string') {
            // Es un string base64 (con o sin prefijo)
            imageData = this.cleanBase64(image);
            mimeType = this.getMimeType(image);
          } else if (image.data && image.mimeType) {
            // Objeto con { data, mimeType }
            imageData = this.cleanBase64(image.data);
            mimeType = image.mimeType;
          } else if (image.buffer && image.mimetype) {
            // Multer file object
            imageData = image.buffer.toString('base64');
            mimeType = image.mimetype;
          } else if (Buffer.isBuffer(image)) {
            // Es un buffer directo
            imageData = image.toString('base64');
            mimeType = 'image/jpeg'; // default
          } else {
            logger.warn(`Formato de imagen no reconocido en índice ${index}`, { image });
            return; // Skip esta imagen
          }
          
          if (!imageData) {
            logger.warn(`Imagen vacía en índice ${index}`);
            return;
          }
          
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: imageData
            }
          });
          
          logger.info(`Imagen agregada correctamente`, { 
            index, 
            mimeType,
            dataLength: imageData.length,
            preview: imageData.substring(0, 50) + '...'
          });
        } catch (error) {
          logger.error(`Error procesando imagen ${index}:`, error);
        }
      });
    }
    
    logger.info('Parts construidos para Gemini', { 
      totalParts: parts.length,
      textParts: parts.filter(p => p.text).length,
      imageParts: parts.filter(p => p.inlineData).length
    });
    
    return parts;
  }

  /**
   * Genera respuesta con imágenes y historial
   * @param {string} conversationId - ID de la conversación
   * @param {string} prompt - Texto del prompt
   * @param {Array} images - Array de imágenes (base64 o buffers)
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de configuración
   * @returns {Promise<Object>} - Respuesta generada
   */
  async generateWithImagesAndHistory(conversationId, prompt, images, userId, options = {}) {
    try {
      logger.info('Generando respuesta con imágenes', {
        conversationId,
        imageCount: images ? images.length : 0,
        promptLength: prompt ? prompt.length : 0
      });

      // Obtener API key del usuario
      const user = options.user || null;
      const apiKey = user ? this.getApiKeyForUser(user) : this.defaultApiKey;

      // Inicializar modelo
      const model = this.initializeModel(options, apiKey);
      
      // Obtener historial existente
      const history = await this.buildConversationHistory(conversationId);
      
      // Iniciar chat con historial
      const chat = model.startChat({
        history: history,
        generationConfig: options.config || DEFAULT_ACADEMIC_CONFIG
      });

      logger.info('Chat iniciado con historial', { 
        conversationId, 
        historyLength: history.length 
      });

      // Construir parts con texto e imágenes
      const parts = this.buildMultimodalParts(prompt, images);
      
      if (parts.length === 0) {
        throw new Error('No se pudieron construir las parts para el mensaje');
      }

      logger.info('Enviando mensaje multimodal a Gemini', {
        partsCount: parts.length,
        hasImages: parts.some(p => p.inlineData)
      });

      // Enviar mensaje con imágenes
      const result = await chat.sendMessage(parts);
      const response = result.response;
      const text = response.text();

      logger.info('Respuesta recibida de Gemini', {
        responseLength: text.length,
        finishReason: response.candidates?.[0]?.finishReason
      });

      // Guardar mensaje del usuario
      const userTokens = await this.countTokens(prompt);
      await messageService.createMessage({
        conversationId,
        role: 'user',
        content: prompt,
        type: images && images.length > 0 ? 'multimodal' : 'text',
        tokens: userTokens,
        metadata: {
          hasImages: images && images.length > 0,
          imageCount: images ? images.length : 0
        }
      });

      // Guardar respuesta del asistente
      const assistantTokens = response.usageMetadata?.candidatesTokenCount || 
                              response.usageMetadata?.totalTokenCount || 
                              await this.countTokens(text);
      
      const assistantMessage = await messageService.createMessage({
        conversationId,
        role: 'assistant',
        content: text,
        type: 'text',
        tokens: assistantTokens
      });

      // Actualizar conversación
      await conversationService.updateConversation(conversationId, userId, {
        updatedAt: new Date(),
        lastMessageAt: new Date()
      });

      return {
        conversationId,
        messageId: assistantMessage._id,
        response: text,
        tokens: {
          prompt: response.usageMetadata?.promptTokenCount || 0,
          completion: response.usageMetadata?.candidatesTokenCount || 0,
          total: response.usageMetadata?.totalTokenCount || 0
        },
        metadata: {
          historyLength: history.length,
          totalMessages: history.length + 2,
          usingPersonalApiKey: apiKey !== this.defaultApiKey,
          processedImages: images ? images.length : 0
        }
      };
    } catch (error) {
      logger.error('Error generando con imágenes e historial:', error);
      throw error;
    }
  }

  /**
   * Genera respuesta con imágenes, historial y streaming
   * @param {string} conversationId - ID de la conversación
   * @param {string} prompt - Texto del prompt
   * @param {Array} images - Array de imágenes (base64 o buffers)
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de configuración
   * @returns {Promise<Object>} - Respuesta generada con streaming
   */
  async streamWithImagesAndHistory(conversationId, prompt, images, userId, options = {}) {
    try {
      logger.info('Streaming con imágenes', {
        conversationId,
        imageCount: images ? images.length : 0
      });

      // Obtener API key del usuario
      const user = options.user || null;
      const apiKey = user ? this.getApiKeyForUser(user) : this.defaultApiKey;

      const model = this.initializeModel(options, apiKey);
      const history = await this.buildConversationHistory(conversationId);
      
      const chat = model.startChat({
        history: history,
        generationConfig: options.config || DEFAULT_ACADEMIC_CONFIG
      });

      // Construir parts
      const parts = this.buildMultimodalParts(prompt, images);
      
      if (parts.length === 0) {
        throw new Error('No se pudieron construir las parts para el mensaje');
      }

      // Enviar con streaming
      const result = await chat.sendMessageStream(parts);
      
      let fullText = '';
      let chunks = 0;

      // Guardar mensaje del usuario inmediatamente
      const userTokens = await this.countTokens(prompt);
      await messageService.createMessage({
        conversationId,
        role: 'user',
        content: prompt,
        type: images && images.length > 0 ? 'multimodal' : 'text',
        tokens: userTokens,
        metadata: {
          hasImages: images && images.length > 0,
          imageCount: images ? images.length : 0
        }
      });

      // Procesar stream
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        chunks++;

        // Callback para enviar chunk al cliente
        if (options.onChunk) {
          options.onChunk({
            chunk: chunkText,
            conversationId,
            chunkNumber: chunks
          });
        }
      }

      // Obtener metadata final
      const finalResponse = await result.response;

      // Guardar respuesta completa
      const assistantTokens = finalResponse.usageMetadata?.candidatesTokenCount || 
                              finalResponse.usageMetadata?.totalTokenCount || 
                              await this.countTokens(fullText);
      
      const assistantMessage = await messageService.createMessage({
        conversationId,
        role: 'assistant',
        content: fullText,
        type: 'text',
        tokens: assistantTokens
      });

      await conversationService.updateConversation(conversationId, userId, {
        updatedAt: new Date(),
        lastMessageAt: new Date()
      });

      return {
        conversationId,
        messageId: assistantMessage._id,
        response: fullText,
        chunks,
        tokens: {
          prompt: finalResponse.usageMetadata?.promptTokenCount || 0,
          completion: finalResponse.usageMetadata?.candidatesTokenCount || 0,
          total: finalResponse.usageMetadata?.totalTokenCount || 0
        },
        metadata: {
          historyLength: history.length,
          totalMessages: history.length + 2,
          usingPersonalApiKey: apiKey !== this.defaultApiKey,
          processedImages: images ? images.length : 0
        }
      };
    } catch (error) {
      logger.error('Error en streaming con imágenes:', error);
      throw error;
    }
  }

  // ============================================
  // METODOS LEGADOS (Mantener compatibilidad)
  // ============================================

  /**
   * Genera contenido con streaming
   * @param {string} prompt - Texto del prompt
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Promise<Object>} - Stream de respuesta
   */
  async generateContentStream(prompt, config = {}, apiKey = null) {
    try {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt invalido');
      }

      const model = this.getModel(config, apiKey);
      const result = await model.generateContentStream(prompt);

      return result;
    } catch (error) {
      throw new Error(`Error generando contenido stream: ${error.message}`);
    }
  }

  /**
   * Genera contenido multimodal (texto + imagenes/audio/pdf)
   * @param {Array} parts - Array de partes del contenido
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Promise<Object>} - Respuesta generada
   */
  async generateMultimodalContent(parts, config = {}, apiKey = null) {
    try {
      if (!Array.isArray(parts) || parts.length === 0) {
        throw new Error('Parts debe ser un array no vacio');
      }

      const model = this.getModel(config, apiKey);
      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        response: response,
        candidates: response.candidates
      };
    } catch (error) {
      throw new Error(`Error generando contenido multimodal: ${error.message}`);
    }
  }

  /**
   * Genera contenido multimodal con streaming
   * @param {Array} parts - Array de partes del contenido
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Promise<Object>} - Stream de respuesta
   */
  async generateMultimodalContentStream(parts, config = {}, apiKey = null) {
    try {
      if (!Array.isArray(parts) || parts.length === 0) {
        throw new Error('Parts debe ser un array no vacio');
      }

      const model = this.getModel(config, apiKey);
      const result = await model.generateContentStream(parts);

      return result;
    } catch (error) {
      throw new Error(`Error generando contenido multimodal stream: ${error.message}`);
    }
  }

  /**
   * Inicia un chat
   * @param {Array} history - Historial de mensajes
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Object} - Instancia de chat
   */
  startChat(history = [], config = {}, apiKey = null) {
    try {
      const model = this.getModel(config, apiKey);
      
      const chat = model.startChat({
        history: history,
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxOutputTokens || 2048,
        }
      });

      return chat;
    } catch (error) {
      throw new Error(`Error iniciando chat: ${error.message}`);
    }
  }

  /**
   * Envia un mensaje en un chat existente
   * @param {Object} chat - Instancia de chat
   * @param {string} message - Mensaje a enviar
   * @returns {Promise<Object>} - Respuesta del chat
   */
  async sendChatMessage(chat, message) {
    try {
      if (!chat || !message) {
        throw new Error('Chat y message son requeridos');
      }

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        response: response
      };
    } catch (error) {
      throw new Error(`Error enviando mensaje: ${error.message}`);
    }
  }

  /**
   * Genera contenido con historial (para conversaciones)
   * @param {string} prompt - Texto del prompt
   * @param {Array} history - Historial de mensajes
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Promise<Object>} - Stream de respuesta
   */
  async generateContentStreamWithHistory(prompt, history, config = {}, apiKey = null) {
    try {
      const chat = this.startChat(history, config, apiKey);
      const result = await chat.sendMessageStream(prompt);
      
      return result;
    } catch (error) {
      throw new Error(`Error generando contenido con historial: ${error.message}`);
    }
  }

  /**
   * Cuenta tokens de un prompt (con fallback a estimacion)
   * @param {string|Array} content - Contenido a contar
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Promise<number>} - Numero de tokens
   */
  async countTokens(content, apiKey = null) {
    try {
      if (!content) {
        return 0;
      }

      try {
        const model = this.getModel({}, apiKey);
        const result = await model.countTokens(content);
        return result.totalTokens;
      } catch (apiError) {
        console.warn('countTokens API no disponible, usando estimacion');
        return this.estimateTokens(content);
      }
    } catch (error) {
      console.error('Error en countTokens, usando estimacion:', error.message);
      return this.estimateTokens(content);
    }
  }

  /**
   * Estima tokens basado en caracteres
   * @param {string|Array} content - Contenido a estimar
   * @returns {number} - Numero estimado de tokens
   */
  estimateTokens(content) {
    try {
      if (!content) {
        return 0;
      }

      let text = '';
      
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        text = content.map(part => {
          if (typeof part === 'string') return part;
          if (part.text) return part.text;
          return '';
        }).join(' ');
      }

      const estimatedTokens = Math.ceil(text.length / 5);
      
      return estimatedTokens + 10;
    } catch (error) {
      console.error('Error estimando tokens:', error.message);
      return 100;
    }
  }

  /**
   * Convierte archivo a formato Gemini
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} mimeType - Tipo MIME del archivo
   * @returns {Object} - Parte generativa
   */
  fileToGenerativePart(fileBuffer, mimeType) {
    try {
      if (!fileBuffer || !mimeType) {
        throw new Error('fileBuffer y mimeType son requeridos');
      }

      return {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType
        }
      };
    } catch (error) {
      throw new Error(`Error convirtiendo archivo: ${error.message}`);
    }
  }

  /**
   * Valida la configuracion del modelo
   * @param {Object} config - Configuracion a validar
   * @returns {boolean} - true si es valida
   */
  validateConfig(config) {
    try {
      if (config.temperature !== undefined) {
        if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
          throw new Error('Temperature debe estar entre 0 y 2');
        }
      }

      if (config.maxOutputTokens !== undefined) {
        if (typeof config.maxOutputTokens !== 'number' || config.maxOutputTokens < 1) {
          throw new Error('maxOutputTokens debe ser mayor a 0');
        }
      }

      if (config.topK !== undefined) {
        if (typeof config.topK !== 'number' || config.topK < 1) {
          throw new Error('topK debe ser mayor a 0');
        }
      }

      if (config.topP !== undefined) {
        if (typeof config.topP !== 'number' || config.topP < 0 || config.topP > 1) {
          throw new Error('topP debe estar entre 0 y 1');
        }
      }

      return true;
    } catch (error) {
      throw new Error(`Error validando configuracion: ${error.message}`);
    }
  }

/**
   * Obtiene informacion del modelo actual
   */
  getModelInfo() {
    return {
      defaultModel: this.defaultModel,
      defaultApiKeyConfigured: !!this.defaultApiKey,
      cachedClients: this.clientCache.size,
      academicModeEnabled: true,
      multimodalSupported: true,
      availableModels: [
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-2.5-flash'
      ]
    };
  }

  /**
   * Limpia el cache de clientes
   */
  clearClientCache() {
    this.clientCache.clear();
    logger.info('Cache de clientes limpiado');
  }
}

module.exports = new GeminiClientService();