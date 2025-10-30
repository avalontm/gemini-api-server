// src/services/gemini/visionAnalysis.service.js

const geminiClient = require('./geminiClient.service');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');
const fs = require('fs').promises;

class VisionAnalysisService {
  /**
   * Analiza una imagen con un prompt
   * @param {Object} data - Datos del analisis
   * @param {string} data.prompt - Prompt de texto
   * @param {string} data.imagePath - Ruta de la imagen
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Analisis generado
   */
  async analyzeImage(data) {
    try {
      const { prompt, imagePath, userId, conversationId, config = {} } = data;

      if (!prompt || !imagePath || !userId) {
        throw new Error('prompt, imagePath y userId son requeridos');
      }

      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          throw new Error('Conversacion no encontrada');
        }
      } else {
        const title = `Analisis de imagen: ${prompt.substring(0, 40)}...`;
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['image', 'vision']
        });
      }

      const imageBuffer = await fs.readFile(imagePath);
      const mimeType = this.getMimeType(imagePath);

      const imagePart = geminiClient.fileToGenerativePart(imageBuffer, mimeType);

      const parts = [
        { text: prompt },
        imagePart
      ];

      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: prompt,
        type: 'image',
        attachments: [{
          type: 'image',
          url: imagePath,
          name: imagePath.split('/').pop()
        }],
        tokens: await geminiClient.countTokens(prompt)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        userMessage._id
      );

      const result = await geminiClient.generateMultimodalContent(parts, config);

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: result.text,
        type: 'image',
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
        imageUrl: imagePath,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          imageFormat: mimeType,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error analizando imagen: ${error.message}`);
    }
  }

  /**
   * Analiza multiples imagenes con un prompt
   * @param {Object} data - Datos del analisis
   * @param {string} data.prompt - Prompt de texto
   * @param {Array} data.imagePaths - Array de rutas de imagenes
   * @param {string} data.userId - ID del usuario
   * @param {string} data.conversationId - ID de conversacion (opcional)
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Analisis generado
   */
  async analyzeMultipleImages(data) {
    try {
      const { prompt, imagePaths, userId, conversationId, config = {} } = data;

      if (!prompt || !imagePaths || !Array.isArray(imagePaths) || !userId) {
        throw new Error('prompt, imagePaths (array) y userId son requeridos');
      }

      if (imagePaths.length === 0) {
        throw new Error('Se requiere al menos una imagen');
      }

      if (imagePaths.length > 10) {
        throw new Error('Maximo 10 imagenes por analisis');
      }

      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          throw new Error('Conversacion no encontrada');
        }
      } else {
        const title = `Analisis multiple: ${prompt.substring(0, 40)}...`;
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['image', 'vision', 'multiple']
        });
      }

      const parts = [{ text: prompt }];
      const attachments = [];

      for (const imagePath of imagePaths) {
        const imageBuffer = await fs.readFile(imagePath);
        const mimeType = this.getMimeType(imagePath);
        const imagePart = geminiClient.fileToGenerativePart(imageBuffer, mimeType);
        
        parts.push(imagePart);
        attachments.push({
          type: 'image',
          url: imagePath,
          name: imagePath.split('/').pop()
        });
      }

      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: prompt,
        type: 'image',
        attachments,
        tokens: await geminiClient.countTokens(prompt)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        userMessage._id
      );

      const result = await geminiClient.generateMultimodalContent(parts, config);

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: result.text,
        type: 'image',
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
        imageUrls: imagePaths,
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          imageCount: imagePaths.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error analizando multiples imagenes: ${error.message}`);
    }
  }

  /**
   * Describe una imagen sin prompt especifico
   * @param {Object} data - Datos del analisis
   * @param {string} data.imagePath - Ruta de la imagen
   * @param {string} data.userId - ID del usuario
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Descripcion generada
   */
  async describeImage(data) {
    try {
      const { imagePath, userId, config = {} } = data;

      const defaultPrompt = 'Describe esta imagen con detalle, incluyendo objetos, personas, colores, ambiente y cualquier detalle relevante.';

      return await this.analyzeImage({
        prompt: defaultPrompt,
        imagePath,
        userId,
        config
      });
    } catch (error) {
      throw new Error(`Error describiendo imagen: ${error.message}`);
    }
  }

  /**
   * Compara dos imagenes
   * @param {Object} data - Datos de la comparacion
   * @param {string} data.image1Path - Ruta de la primera imagen
   * @param {string} data.image2Path - Ruta de la segunda imagen
   * @param {string} data.userId - ID del usuario
   * @param {Object} data.config - Configuracion opcional
   * @returns {Promise<Object>} - Comparacion generada
   */
  async compareImages(data) {
    try {
      const { image1Path, image2Path, userId, config = {} } = data;

      if (!image1Path || !image2Path || !userId) {
        throw new Error('image1Path, image2Path y userId son requeridos');
      }

      const prompt = 'Compara estas dos imagenes y describe las similitudes, diferencias, y cualquier detalle relevante entre ellas.';

      return await this.analyzeMultipleImages({
        prompt,
        imagePaths: [image1Path, image2Path],
        userId,
        config
      });
    } catch (error) {
      throw new Error(`Error comparando imagenes: ${error.message}`);
    }
  }

  /**
   * Obtiene el tipo MIME de un archivo por extension
   * @param {string} filePath - Ruta del archivo
   * @returns {string} - Tipo MIME
   */
  getMimeType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };

    return mimeTypes[extension] || 'image/jpeg';
  }

  /**
   * Valida el formato de imagen soportado
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - true si es soportado
   */
  validateImageFormat(filePath) {
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const extension = filePath.split('.').pop().toLowerCase();

    if (!supportedFormats.includes(extension)) {
      throw new Error(`Formato de imagen no soportado. Formatos permitidos: ${supportedFormats.join(', ')}`);
    }

    return true;
  }
}

module.exports = new VisionAnalysisService();