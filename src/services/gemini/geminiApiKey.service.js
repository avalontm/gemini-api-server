// src/services/gemini/geminiApiKey.service.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiApiKeyService {
  /**
   * Valida si una API key de Gemini es valida
   * @param {string} apiKey - API key a validar
   * @returns {Promise<Object>} - Resultado de la validacion
   */
  async validateApiKey(apiKey) {
    try {
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        return {
          isValid: false,
          error: 'API key no proporcionada o invalida',
        };
      }

      // Validar formato basico de la API key
      if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        return {
          isValid: false,
          error: 'Formato de API key invalido',
        };
      }

      // Intentar hacer una peticion simple a la API de Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp' 
      });

      // Hacer una peticion minima para verificar que la key funciona
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hi' }],
          },
        ],
      });

      if (!result || !result.response) {
        return {
          isValid: false,
          error: 'No se pudo verificar la API key',
        };
      }

      return {
        isValid: true,
        message: 'API key validada correctamente',
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      };

    } catch (error) {
      console.error('Error validando API key:', error.message);

      // Analizar el tipo de error
      let errorMessage = 'Error al validar la API key';

      if (error.message.includes('API_KEY_INVALID') || 
          error.message.includes('invalid') || 
          error.message.includes('400')) {
        errorMessage = 'API key invalida o revocada';
      } else if (error.message.includes('quota') || 
                 error.message.includes('429')) {
        errorMessage = 'Limite de cuota excedido en esta API key';
      } else if (error.message.includes('permission') || 
                 error.message.includes('403')) {
        errorMessage = 'API key sin permisos suficientes';
      } else if (error.message.includes('network') || 
                 error.message.includes('ENOTFOUND')) {
        errorMessage = 'Error de conexion con el servicio de Gemini';
      }

      return {
        isValid: false,
        error: errorMessage,
        details: error.message,
      };
    }
  }

  /**
   * Obtiene informacion sobre una API key (sin revelar la key completa)
   * @param {string} apiKey - API key a analizar
   * @returns {Object} - Informacion de la API key
   */
  getApiKeyInfo(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        masked: null,
        length: 0,
        isValid: false,
      };
    }

    // Mostrar solo los primeros 8 y ultimos 4 caracteres
    const masked = apiKey.length > 12 
      ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
      : '***';

    return {
      masked,
      length: apiKey.length,
      startsWithAIza: apiKey.startsWith('AIza'),
      isValid: apiKey.startsWith('AIza') && apiKey.length >= 30,
    };
  }

  /**
   * Obtiene la API key apropiada para un usuario
   * @param {Object} user - Usuario de Mongoose
   * @returns {string} - API key a usar
   */
  getApiKeyForUser(user) {
    if (user && user.getGeminiApiKey) {
      return user.getGeminiApiKey();
    }
    
    return process.env.GEMINI_API_KEY;
  }

  /**
   * Verifica si un usuario esta usando su API key personal
   * @param {Object} user - Usuario de Mongoose
   * @returns {boolean}
   */
  isUsingPersonalApiKey(user) {
    if (!user || !user.hasPersonalApiKey) {
      return false;
    }
    
    return user.hasPersonalApiKey();
  }

  /**
   * Compara dos API keys de forma segura
   * @param {string} key1 - Primera API key
   * @param {string} key2 - Segunda API key
   * @returns {boolean} - true si son iguales
   */
  compareApiKeys(key1, key2) {
    if (!key1 || !key2) {
      return false;
    }

    // Comparacion de tiempo constante para evitar timing attacks
    const crypto = require('crypto');
    const hash1 = crypto.createHash('sha256').update(key1).digest();
    const hash2 = crypto.createHash('sha256').update(key2).digest();
    
    return crypto.timingSafeEqual(hash1, hash2);
  }

  /**
   * Sanitiza una API key para logging (oculta la mayor parte)
   * @param {string} apiKey - API key a sanitizar
   * @returns {string} - API key sanitizada
   */
  sanitizeApiKeyForLogging(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return '[NO_KEY]';
    }

    if (apiKey.length < 12) {
      return '***';
    }

    return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`;
  }

  /**
   * Verifica si la API key del servidor esta configurada
   * @returns {boolean}
   */
  hasServerApiKey() {
    return !!(process.env.GEMINI_API_KEY && 
              process.env.GEMINI_API_KEY.trim() !== '');
  }

  /**
   * Obtiene estadisticas de uso de API keys personales
   * @param {Array} users - Array de usuarios
   * @returns {Object} - Estadisticas
   */
  getApiKeyStats(users) {
    if (!Array.isArray(users)) {
      return {
        total: 0,
        withPersonalKey: 0,
        activePersonalKeys: 0,
        usingPersonalKey: 0,
      };
    }

    const stats = {
      total: users.length,
      withPersonalKey: 0,
      activePersonalKeys: 0,
      usingPersonalKey: 0,
    };

    users.forEach(user => {
      if (user.geminiApiKey) {
        stats.withPersonalKey++;
        
        if (user.geminiApiKeyStatus && user.geminiApiKeyStatus.isActive) {
          stats.activePersonalKeys++;
          
          if (user.preferences && user.preferences.usePersonalApiKey) {
            stats.usingPersonalKey++;
          }
        }
      }
    });

    return stats;
  }
}

module.exports = new GeminiApiKeyService();