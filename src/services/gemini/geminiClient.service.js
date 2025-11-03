// src/services/gemini/geminiClient.service.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiClientService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY no esta configurada en las variables de entorno');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.generativeModel = null;
  }

  /**
   * Inicializa el modelo generativo
   */
  initializeModel(config = {}) {
    try {
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

      this.generativeModel = this.genAI.getGenerativeModel(defaultConfig);
      return this.generativeModel;
    } catch (error) {
      throw new Error(`Error inicializando modelo: ${error.message}`);
    }
  }

  /**
   * Obtiene el modelo generativo (inicializa si es necesario)
   */
  getModel(config = {}) {
    if (!this.generativeModel || Object.keys(config).length > 0) {
      return this.initializeModel(config);
    }
    return this.generativeModel;
  }

  /**
   * Genera contenido a partir de un prompt de texto
   */
  async generateContent(prompt, config = {}) {
    try {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt invalido');
      }

      const model = this.getModel(config);
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
   */
  async generateContentStream(prompt, config = {}) {
    try {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt invalido');
      }

      const model = this.getModel(config);
      const result = await model.generateContentStream(prompt);

      return result;
    } catch (error) {
      throw new Error(`Error generando contenido stream: ${error.message}`);
    }
  }

  /**
   * Genera contenido multimodal (texto + imagenes/audio/pdf)
   */
  async generateMultimodalContent(parts, config = {}) {
    try {
      if (!Array.isArray(parts) || parts.length === 0) {
        throw new Error('Parts debe ser un array no vacio');
      }

      const model = this.getModel(config);
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
   */
  async generateMultimodalContentStream(parts, config = {}) {
    try {
      if (!Array.isArray(parts) || parts.length === 0) {
        throw new Error('Parts debe ser un array no vacio');
      }

      const model = this.getModel(config);
      const result = await model.generateContentStream(parts);

      return result;
    } catch (error) {
      throw new Error(`Error generando contenido multimodal stream: ${error.message}`);
    }
  }

  /**
   * Inicia un chat
   */
  startChat(history = [], config = {}) {
    try {
      const model = this.getModel(config);
      
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
   */
  async generateContentStreamWithHistory(prompt, history, config = {}) {
    try {
      const chat = this.startChat(history, config);
      const result = await chat.sendMessageStream(prompt);
      
      return result;
    } catch (error) {
      throw new Error(`Error generando contenido con historial: ${error.message}`);
    }
  }

  /**
   * Cuenta tokens de un prompt (con fallback a estimacion)
   */
  async countTokens(content) {
    try {
      if (!content) {
        return 0;
      }

      try {
        const model = this.getModel();
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
      model: this.model,
      apiKeyConfigured: !!this.apiKey,
      modelInitialized: !!this.generativeModel
    };
  }
}

module.exports = new GeminiClientService();