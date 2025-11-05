// src/services/gemini/geminiClient.service.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiClientService {
  constructor() {
    this.defaultApiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    
    if (!this.defaultApiKey) {
      console.warn('ADVERTENCIA: GEMINI_API_KEY no esta configurada en las variables de entorno');
    }

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
   * Inicializa el modelo generativo
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Object} - Modelo generativo
   */
  initializeModel(config = {}, apiKey = null) {
    try {
      const client = this.getClient(apiKey);
      
      const defaultConfig = {
        model: this.model,
        generationConfig: {
          temperature: config.temperature || 0.7,
          topK: config.topK || 40,
          topP: config.topP || 0.95,
          maxOutputTokens: config.maxOutputTokens || 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      };

      return client.getGenerativeModel(defaultConfig);
    } catch (error) {
      throw new Error(`Error inicializando modelo: ${error.message}`);
    }
  }

  /**
   * Obtiene el modelo generativo
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Object} - Modelo generativo
   */
  getModel(config = {}, apiKey = null) {
    return this.initializeModel(config, apiKey);
  }

  /**
   * Genera contenido a partir de un prompt de texto
   * @param {string} prompt - Texto del prompt
   * @param {Object} config - Configuracion del modelo
   * @param {string} apiKey - API key a usar (opcional)
   * @returns {Promise<Object>} - Respuesta generada
   */
  async generateContent(prompt, config = {}, apiKey = null) {
    try {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt invalido');
      }

      const model = this.getModel(config, apiKey);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        response: response,
        candidates: response.candidates,
        promptFeedback: response.promptFeedback
      };
    } catch (error) {
      throw new Error(`Error generando contenido: ${error.message}`);
    }
  }

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
   * @returns {Object} - Informacion del modelo
   */
  getModelInfo() {
    return {
      model: this.model,
      defaultApiKeyConfigured: !!this.defaultApiKey,
      cachedClients: this.clientCache.size
    };
  }

  /**
   * Limpia el cache de clientes
   */
  clearClientCache() {
    this.clientCache.clear();
  }

  /**
   * Obtiene la API key apropiada para un usuario
   * @param {Object} user - Usuario de Mongoose
   * @returns {string|null} - API key a usar
   */
  getApiKeyForUser(user) {
    if (!user) {
      return this.defaultApiKey;
    }

    // Si el usuario tiene metodo getGeminiApiKey, usarlo
    if (typeof user.getGeminiApiKey === 'function') {
      return user.getGeminiApiKey();
    }

    // Si el usuario tiene preferencias y API key personal
    if (user.preferences?.usePersonalApiKey && user.geminiApiKey) {
      return user.decryptApiKey ? user.decryptApiKey(user.geminiApiKey) : null;
    }

    return this.defaultApiKey;
  }
}

module.exports = new GeminiClientService();