// src/services/gemini/multimodal.service.js

const geminiClient = require('./geminiClient.service');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');
const fs = require('fs').promises;

class MultimodalService {
  /**
   * Analiza contenido multimodal (imagenes, audio, PDFs)
   * @param {Object} data - Datos del analisis
   * @returns {Promise<Object>} - Resultado del analisis
   */
  async analyzeMultimodal(data) {
    try {
      const { 
        prompt, 
        files, 
        userId, 
        conversationId, 
        config = {} 
      } = data;

      if (!prompt && (!files || files.length === 0)) {
        throw new Error('Se requiere al menos un prompt o archivos');
      }

      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          throw new Error('Conversacion no encontrada');
        }
      } else {
        const title = this.generateTitle(prompt || 'Contenido multimodal');
        const tags = this.extractTags(files);
        
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', ...tags]
        });
      }

      const parts = [];
      const attachments = [];

      if (prompt) {
        parts.push({ text: prompt });
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const fileBuffer = await fs.readFile(file.path);
          const filePart = geminiClient.fileToGenerativePart(fileBuffer, file.mimeType);
          
          parts.push(filePart);
          
          attachments.push({
            type: this.getFileType(file.mimeType),
            url: file.path,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size || 0
          });
        }
      }

      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: prompt || 'Archivo adjunto',
        type: 'multimodal',
        attachments,
        tokens: await geminiClient.countTokens(prompt || 'Archivo adjunto')
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
        type: 'multimodal',
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
        attachments: attachments.map(att => ({
          type: att.type,
          name: att.name,
          size: att.size
        })),
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantMessage.tokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          filesProcessed: files ? files.length : 0,
          fileTypes: this.extractTags(files),
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error en analisis multimodal: ${error.message}`);
    }
  }

  /**
   * Analiza contenido multimodal con streaming
   */
  async analyzeMultimodalStream(data, onChunk) {
    try {
      const { 
        prompt, 
        files, 
        userId, 
        conversationId, 
        config = {} 
      } = data;

      if (!prompt && (!files || files.length === 0)) {
        throw new Error('Se requiere al menos un prompt o archivos');
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
        const title = this.generateTitle(prompt || 'Contenido multimodal');
        const tags = this.extractTags(files);
        
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', 'streaming', ...tags]
        });
      }

      const parts = [];
      const attachments = [];

      if (prompt) {
        parts.push({ text: prompt });
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const fileBuffer = await fs.readFile(file.path);
          const filePart = geminiClient.fileToGenerativePart(fileBuffer, file.mimeType);
          
          parts.push(filePart);
          
          attachments.push({
            type: this.getFileType(file.mimeType),
            url: file.path,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size || 0
          });
        }
      }

      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: prompt || 'Archivo adjunto',
        type: 'multimodal',
        attachments,
        tokens: await geminiClient.countTokens(prompt || 'Archivo adjunto')
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        userMessage._id
      );

      const model = geminiClient.getModel(config);
      const result = await model.generateContentStream(parts);

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
          filesProcessed: files ? files.length : 0,
          fileTypes: this.extractTags(files),
          streamingMode: true,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Error en streaming multimodal: ${error.message}`);
    }
  }

  /**
   * Extrae el tipo de archivo del MIME type
   */
  getFileType(mimeType) {
    if (!mimeType) return 'file';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    
    return 'file';
  }

  /**
   * Extrae tags basados en los archivos
   */
  extractTags(files) {
    if (!files || files.length === 0) return [];
    
    const tags = new Set();
    
    for (const file of files) {
      const type = this.getFileType(file.mimeType);
      tags.add(type);
    }
    
    return Array.from(tags);
  }

  /**
   * Genera titulo basado en el prompt
   */
  generateTitle(prompt) {
    if (!prompt) return 'Contenido multimodal';
    
    const maxLength = 50;
    const cleaned = prompt.trim().replace(/\n/g, ' ');
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  /**
   * Valida tipos de archivo soportados
   */
  validateFileType(mimeType) {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/webm',
      'audio/ogg',
      'application/pdf'
    ];

    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
    }

    return true;
  }

  /**
   * Obtiene informacion de capacidades multimodales
   */
  getCapabilities() {
    return {
      supportedImageFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif'],
      supportedAudioFormats: ['wav', 'mp3', 'mpeg', 'webm', 'ogg'],
      supportedDocumentFormats: ['pdf'],
      maxFilesPerRequest: 10,
      maxFileSizeMB: 10,
      streamingSupported: true
    };
  }
}

module.exports = new MultimodalService();