// src/controllers/gemini/multimodal.controller.js

const multimodalService = require('../../services/gemini/multimodal.service');
const messageService = require('../../services/database/message.service');
const fileStorageService = require('../../services/utils/fileStorage.service');
const markdownProcessor = require('../../services/utils/markdownProcessor.service');
const logger = require('../../utils/logger');

class MultimodalController {
  /**
   * Procesa solicitud multimodal con multiples tipos de archivos
   */
  async processMultimodal(req, res, next) {
    const uploadedFiles = [];
    
    try {
      const { prompt, conversationId, temperature, maxTokens } = req.body;
      const userId = req.user.id;
      const files = req.files || [];

      if (!prompt && files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un prompt o un archivo',
          timestamp: new Date().toISOString()
        });
      }

      for (const file of files) {
        uploadedFiles.push(file.path);
      }

      logger.info('Procesando contenido multimodal', {
        userId,
        conversationId,
        filesCount: files.length,
        hasPrompt: !!prompt
      });

      const processedFiles = files.map(file => ({
        path: file.path,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }));

      const config = {
        temperature: parseFloat(temperature) || 0.7,
        maxOutputTokens: parseInt(maxTokens) || 2048
      };

      const result = await multimodalService.analyzeMultimodal({
        prompt,
        files: processedFiles,
        userId,
        conversationId,
        config,
        user: req.user
      });

      await this.cleanupFiles(uploadedFiles);

      // POST-PROCESAR el contenido markdown
      const processedResponse = markdownProcessor.process(result.response);
      
      // Actualizar el mensaje en la base de datos con el contenido procesado
      if (result.messageId) {
        await messageService.updateMessage(result.messageId, {
          content: processedResponse
        });
      }

      logger.info('Contenido multimodal procesado exitosamente', {
        userId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        filesProcessed: files.length,
        tokens: result.tokens.total,
        contentProcessed: true
      });

      return res.status(200).json({
        success: true,
        message: 'Contenido multimodal procesado exitosamente',
        data: {
          ...result,
          response: processedResponse
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      await this.cleanupFiles(uploadedFiles);
      
      logger.error('Error en processMultimodal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error procesando contenido multimodal',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Procesa solicitud multimodal con streaming
   */
  async processMultimodalStream(req, res, next) {
    const uploadedFiles = [];
    
    try {
      const { prompt, conversationId, temperature, maxTokens } = req.body;
      const userId = req.user.id;
      const files = req.files || [];

      if (!prompt && files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un prompt o un archivo',
          timestamp: new Date().toISOString()
        });
      }

      for (const file of files) {
        uploadedFiles.push(file.path);
      }

      logger.info('Iniciando streaming multimodal', {
        userId,
        conversationId,
        filesCount: files.length
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const processedFiles = files.map(file => ({
        path: file.path,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }));

      const config = {
        temperature: parseFloat(temperature) || 0.7,
        maxOutputTokens: parseInt(maxTokens) || 2048
      };

      res.write(`data: ${JSON.stringify({
        type: 'start',
        conversationId: conversationId || null,
        filesCount: files.length,
        timestamp: new Date().toISOString()
      })}\n\n`);

      let fullText = '';
      let chunkCount = 0;

      const onChunk = (data) => {
        fullText += data.chunk;
        chunkCount++;
        
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          text: data.chunk,
          accumulated: data.accumulated,
          chunkNumber: data.chunkNumber,
          conversationId: data.conversationId,
          timestamp: new Date().toISOString()
        })}\n\n`);
      };

      const result = await multimodalService.analyzeMultimodalStream(
        {
          prompt,
          files: processedFiles,
          userId,
          conversationId,
          config,
          user: req.user
        },
        onChunk
      );

      await this.cleanupFiles(uploadedFiles);

      // POST-PROCESAR el contenido completo al finalizar streaming
      const processedFullText = markdownProcessor.processStreamComplete(fullText);

      logger.info('Contenido procesado despues de streaming multimodal', {
        originalLength: fullText.length,
        processedLength: processedFullText.length,
        chunks: chunkCount
      });

      // Actualizar el mensaje en la base de datos con el contenido procesado
      if (result.messageId) {
        await messageService.updateMessage(result.messageId, {
          content: processedFullText
        });
      }

      logger.info('Streaming multimodal completado', {
        userId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        chunks: chunkCount,
        tokens: result.tokens.total,
        contentProcessed: true
      });

      res.write(`data: ${JSON.stringify({
        type: 'end',
        messageId: result.messageId,
        conversationId: result.conversationId,
        tokens: result.tokens,
        attachments: result.attachments,
        chunks: chunkCount,
        fullText: processedFullText,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();
    } catch (error) {
      await this.cleanupFiles(uploadedFiles);
      
      logger.error('Error en processMultimodalStream:', error);
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Error procesando contenido multimodal',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          timestamp: new Date().toISOString()
        });
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
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
      const { criteria, conversationId, temperature, maxTokens } = req.body;
      const userId = req.user.id;
      const files = req.files || [];

      if (files.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren al menos 2 archivos para comparar',
          timestamp: new Date().toISOString()
        });
      }

      for (const file of files) {
        uploadedFiles.push(file.path);
      }

      logger.info('Comparando archivos', {
        userId,
        conversationId,
        filesCount: files.length
      });

      const processedFiles = files.map(file => ({
        path: file.path,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }));

      const prompt = criteria || 'Compara estos archivos y describe sus similitudes, diferencias y cualquier detalle relevante.';

      const config = {
        temperature: parseFloat(temperature) || 0.7,
        maxOutputTokens: parseInt(maxTokens) || 2048
      };

      const result = await multimodalService.analyzeMultimodal({
        prompt,
        files: processedFiles,
        userId,
        conversationId,
        config,
        user: req.user
      });

      await this.cleanupFiles(uploadedFiles);

      // POST-PROCESAR el contenido markdown
      const processedResponse = markdownProcessor.process(result.response);
      
      // Actualizar el mensaje en la base de datos con el contenido procesado
      if (result.messageId) {
        await messageService.updateMessage(result.messageId, {
          content: processedResponse
        });
      }

      logger.info('Comparacion de archivos completada', {
        userId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        filesCompared: files.length,
        tokens: result.tokens.total,
        contentProcessed: true
      });

      return res.status(200).json({
        success: true,
        message: 'Archivos comparados exitosamente',
        data: {
          ...result,
          response: processedResponse,
          comparisonMode: true,
          filesCompared: files.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      await this.cleanupFiles(uploadedFiles);
      
      logger.error('Error en compareFiles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error comparando archivos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Limpia archivos temporales
   */
  async cleanupFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fileStorageService.deleteFile(filePath);
      } catch (error) {
        logger.error(`Error eliminando archivo ${filePath}:`, error);
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