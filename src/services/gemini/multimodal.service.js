// src/services/gemini/multimodal.service.js

const geminiClient = require('./geminiClient.service');
const conversationService = require('../database/conversation.service');
const messageService = require('../database/message.service');
const fs = require('fs').promises;
const logger = require('../../utils/logger');
const { 
  enhancePrompt,   
  isAcademicFileType 
} = require('../../config/academicContext.config');

class MultimodalService {
  /**
   * Analiza contenido multimodal CON HISTORIAL (imagenes, audio, PDFs)
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
        config = {},
        user = null 
      } = data;

      if (!prompt && (!files || files.length === 0)) {
        throw new Error('Se requiere al menos un prompt o archivos');
      }

      logger.info('Iniciando analisis multimodal', {
        userId,
        conversationId,
        filesCount: files ? files.length : 0,
        hasPrompt: !!prompt
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
        const title = this.generateTitle(prompt || 'Contenido multimodal');
        const tags = this.extractTags(files);
        
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', ...tags],
          metadata: {
            multimodal: true,
            createdBy: 'multimodal-service'
          }
        });
        isNewConversation = true;
      }

      // Procesar archivos y crear parts
      const parts = [];
      const attachments = [];

      if (files && files.length > 0) {
        for (const file of files) {
          this.validateFileType(file.mimeType);
          
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

      // ==========================================
      // CRÍTICO: Mejorar el prompt con recordatorios
      // ==========================================
      const enhancedPrompt = enhancePrompt(prompt || 'Analiza el contenido adjunto', {
        hasFiles: true,
        fileCount: files ? files.length : 0,
        forceComparison: files && files.length > 1
      });

      logger.info('Prompt mejorado con recordatorios contextuales', {
        originalLength: prompt ? prompt.length : 0,
        enhancedLength: enhancedPrompt.length,
        filesAttached: files ? files.length : 0
      });

      // Agregar prompt mejorado al final (despues de los archivos)
      parts.push({ text: enhancedPrompt });

      // Guardar mensaje del usuario con attachments
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

      // Obtener API key del usuario
      const apiKey = user ? geminiClient.getApiKeyForUser(user) : null;

      // Obtener historial de conversacion
      const history = await geminiClient.buildConversationHistory(conversation._id);

      // Inicializar modelo
      const model = geminiClient.initializeModel(
        { config },
        apiKey
      );

      // Iniciar chat con historial
      const chat = model.startChat({
        history: history,
        generationConfig: config
      });

      logger.info('Chat multimodal iniciado con historial', {
        conversationId: conversation._id,
        historyLength: history.length,
        partsCount: parts.length,
        hasImages: parts.some(p => p.inlineData)
      });

      // Enviar mensaje con partes multimodales
      const result = await chat.sendMessage(parts);
      const response = result.response;
      const text = response.text();

      // Guardar respuesta del asistente
      const assistantTokens = response.usageMetadata?.candidatesTokenCount || 
                              response.usageMetadata?.totalTokenCount || 
                              await geminiClient.countTokens(text);

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: text,
        type: 'multimodal',
        tokens: assistantTokens
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantTokens;
      await conversationService.updateTokenUsage(conversation._id, assistantTokens);

      logger.info('Analisis multimodal completado', {
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        filesProcessed: files ? files.length : 0,
        tokens: totalTokens
      });

      return {
        response: text,
        conversationId: conversation._id,
        messageId: assistantMessage._id,
        attachments: attachments.map(att => ({
          type: att.type,
          name: att.name,
          size: att.size
        })),
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantTokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          filesProcessed: files ? files.length : 0,
          fileTypes: this.extractTags(files),
          historyLength: history.length,
          totalMessages: history.length + 2,
          isNewConversation,
          usingPersonalApiKey: apiKey !== geminiClient.defaultApiKey,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Error en analisis multimodal:', error);
      throw new Error(`Error en analisis multimodal: ${error.message}`);
    }
  }

  /**
   * Analiza contenido multimodal con streaming Y CON HISTORIAL
   */
  async analyzeMultimodalStream(data, onChunk) {
    try {
      const { 
        prompt, 
        files, 
        userId, 
        conversationId, 
        config = {},
        user = null 
      } = data;

      if (!prompt && (!files || files.length === 0)) {
        throw new Error('Se requiere al menos un prompt o archivos');
      }

      if (typeof onChunk !== 'function') {
        throw new Error('onChunk debe ser una funcion');
      }

      logger.info('Iniciando streaming multimodal', {
        userId,
        conversationId,
        filesCount: files ? files.length : 0
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
        const title = this.generateTitle(prompt || 'Contenido multimodal');
        const tags = this.extractTags(files);
        
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', 'streaming', ...tags],
          metadata: {
            multimodal: true,
            streaming: true,
            createdBy: 'multimodal-service'
          }
        });
        isNewConversation = true;
      }

      // Procesar archivos
      const parts = [];
      const attachments = [];

      if (files && files.length > 0) {
        for (const file of files) {
          this.validateFileType(file.mimeType);
          
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

      // ==========================================
      // CRÍTICO: Mejorar el prompt con recordatorios
      // ==========================================
      const enhancedPrompt = enhancePrompt(prompt || 'Analiza el contenido adjunto', {
        hasFiles: true,
        fileCount: files ? files.length : 0,
        forceComparison: files && files.length > 1
      });

      logger.info('Prompt mejorado para streaming', {
        originalLength: prompt ? prompt.length : 0,
        enhancedLength: enhancedPrompt.length,
        filesAttached: files ? files.length : 0
      });

      // Agregar prompt mejorado
      parts.push({ text: enhancedPrompt });

      // Guardar mensaje del usuario
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

      // Obtener API key del usuario
      const apiKey = user ? geminiClient.getApiKeyForUser(user) : null;

      // Obtener historial
      const history = await geminiClient.buildConversationHistory(conversation._id);

      // Inicializar modelo
      const model = geminiClient.initializeModel(
        { config },
        apiKey
      );

      // Iniciar chat con historial
      const chat = model.startChat({
        history: history,
        generationConfig: config
      });

      logger.info('Streaming multimodal iniciado con historial', {
        conversationId: conversation._id,
        historyLength: history.length,
        partsCount: parts.length,
        hasImages: parts.some(p => p.inlineData)
      });

      // Obtener stream
      const result = await chat.sendMessageStream(parts);

      let fullResponse = '';
      let chunkCount = 0;

      // Procesar stream
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

      // Guardar respuesta del asistente
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
        attachments: attachments.map(att => ({
          type: att.type,
          name: att.name,
          size: att.size
        })),
        tokens: {
          prompt: userMessage.tokens,
          completion: assistantTokens,
          total: totalTokens
        },
        metadata: {
          model: geminiClient.model,
          filesProcessed: files ? files.length : 0,
          fileTypes: this.extractTags(files),
          streamingMode: true,
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
      streamingSupported: true,
      historySupported: true
    };
  }
}

module.exports = new MultimodalService();