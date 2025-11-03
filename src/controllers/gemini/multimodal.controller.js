// src/controllers/gemini/multimodal.controller.js

const geminiClient = require('../../services/gemini/geminiClient.service');
const conversationService = require('../../services/database/conversation.service');
const messageService = require('../../services/database/message.service');
const fileStorageService = require('../../services/utils/fileStorage.service');
const fs = require('fs').promises;
const path = require('path');

class MultimodalController {
  /**
   * Procesa solicitud multimodal con multiples tipos de archivos
   */
  async processMultimodal(req, res, next) {
    const uploadedFiles = [];
    
    try {
      const { prompt, conversationId, temperature } = req.body;
      const userId = req.userId;
      const files = req.files || [];

      if (!prompt && files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un prompt o un archivo'
        });
      }

      for (const file of files) {
        uploadedFiles.push(file.path);
      }

      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          return res.status(400).json({
            success: false,
            message: 'Conversacion no encontrada'
          });
        }
      } else {
        const title = this.generateTitle(prompt);
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', ...this.extractTags(files)]
        });
      }

      const parts = [];
      const attachments = [];

      if (prompt) {
        parts.push({ text: prompt });
      }

      for (const file of files) {
        const fileBuffer = await fs.readFile(file.path);
        const filePart = geminiClient.fileToGenerativePart(fileBuffer, file.mimetype);
        
        parts.push(filePart);
        
        attachments.push({
          type: this.getFileType(file.mimetype),
          url: file.path,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        });
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

      const config = {
        temperature: parseFloat(temperature) || 0.7
      };

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

      await this.cleanupFiles(uploadedFiles);

      const fileTypes = files.map(f => this.getFileType(f.mimetype));
      const uniqueFileTypes = [...new Set(fileTypes)];

      return res.status(200).json({
        success: true,
        data: {
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
            filesProcessed: files.length,
            fileTypes: uniqueFileTypes,
            temperature: config.temperature,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      await this.cleanupFiles(uploadedFiles);
      
      console.error('Error en processMultimodal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error procesando contenido multimodal',
        error: error.message
      });
    }
  }

  /**
   * Procesa solicitud multimodal con streaming
   */
  async processMultimodalStream(req, res, next) {
    const uploadedFiles = [];
    
    try {
      const { prompt, conversationId, temperature } = req.body;
      const userId = req.userId;
      const files = req.files || [];

      if (!prompt && files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un prompt o un archivo'
        });
      }

      for (const file of files) {
        uploadedFiles.push(file.path);
      }

      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          return res.status(400).json({
            success: false,
            message: 'Conversacion no encontrada'
          });
        }
      } else {
        const title = this.generateTitle(prompt);
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', 'streaming', ...this.extractTags(files)]
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const parts = [];
      const attachments = [];

      if (prompt) {
        parts.push({ text: prompt });
      }

      for (const file of files) {
        const fileBuffer = await fs.readFile(file.path);
        const filePart = geminiClient.fileToGenerativePart(fileBuffer, file.mimetype);
        
        parts.push(filePart);
        
        attachments.push({
          type: this.getFileType(file.mimetype),
          url: file.path,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        });
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

      const config = {
        temperature: parseFloat(temperature) || 0.7
      };

      const model = geminiClient.getModel(config);
      const result = await model.generateContentStream(parts);

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        chunkCount++;

        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          chunk: chunkText,
          accumulated: fullResponse,
          chunkNumber: chunkCount,
          conversationId: conversation._id
        })}\n\n`);
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

      await this.cleanupFiles(uploadedFiles);

      const fileTypes = files.map(f => this.getFileType(f.mimetype));
      const uniqueFileTypes = [...new Set(fileTypes)];

      res.write(`data: ${JSON.stringify({
        type: 'done',
        result: {
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
            filesProcessed: files.length,
            fileTypes: uniqueFileTypes,
            streamingMode: true,
            timestamp: new Date()
          }
        }
      })}\n\n`);

      res.end();
    } catch (error) {
      await this.cleanupFiles(uploadedFiles);
      
      console.error('Error en processMultimodalStream:', error);
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Error procesando contenido multimodal',
          error: error.message
        });
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: error.message
        })}\n\n`);
        res.end();
      }
    }
  }

  /**
   * Compara multiples archivos
   */
  async compareFiles(req, res, next) {
    const uploadedFiles = [];
    
    try {
      const { criteria, conversationId, temperature } = req.body;
      const userId = req.userId;
      const files = req.files || [];

      if (files.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren al menos 2 archivos para comparar'
        });
      }

      for (const file of files) {
        uploadedFiles.push(file.path);
      }

      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversationById(conversationId, userId);
        if (!conversation) {
          return res.status(400).json({
            success: false,
            message: 'Conversacion no encontrada'
          });
        }
      } else {
        const title = criteria || 'Comparacion de archivos';
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['multimodal', 'comparison', ...this.extractTags(files)]
        });
      }

      const parts = [];
      const attachments = [];

      const prompt = criteria || 'Compara estos archivos y describe sus similitudes, diferencias y cualquier detalle relevante.';
      parts.push({ text: prompt });

      for (const file of files) {
        const fileBuffer = await fs.readFile(file.path);
        const filePart = geminiClient.fileToGenerativePart(fileBuffer, file.mimetype);
        
        parts.push(filePart);
        
        attachments.push({
          type: this.getFileType(file.mimetype),
          url: file.path,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        });
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

      const config = {
        temperature: parseFloat(temperature) || 0.7
      };

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

      await this.cleanupFiles(uploadedFiles);

      const fileTypes = files.map(f => this.getFileType(f.mimetype));
      const uniqueFileTypes = [...new Set(fileTypes)];

      return res.status(200).json({
        success: true,
        data: {
          response: result.text,
          conversationId: conversation._id,
          messageId: assistantMessage._id,
          comparedFiles: attachments.map(att => ({
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
            filesCompared: files.length,
            fileTypes: uniqueFileTypes,
            comparisonMode: true,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      await this.cleanupFiles(uploadedFiles);
      
      console.error('Error en compareFiles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error comparando archivos',
        error: error.message
      });
    }
  }

  /**
   * Utilidades
   */
  
  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'file';
  }

  extractTags(files) {
    const tags = new Set();
    
    for (const file of files) {
      const type = this.getFileType(file.mimetype);
      tags.add(type);
    }
    
    return Array.from(tags);
  }

  generateTitle(prompt) {
    if (!prompt) return 'Contenido multimodal';
    
    const maxLength = 50;
    const cleaned = prompt.trim().replace(/\n/g, ' ');
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  async cleanupFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fileStorageService.deleteFile(filePath);
      } catch (error) {
        console.error(`Error eliminando archivo ${filePath}:`, error.message);
      }
    }
  }
}

const controller = new MultimodalController();

module.exports = {
  processMultimodal: (req, res, next) => controller.processMultimodal(req, res, next),
  processMultimodalStream: (req, res, next) => controller.processMultimodalStream(req, res, next),
  compareFiles: (req, res, next) => controller.compareFiles(req, res, next)
};