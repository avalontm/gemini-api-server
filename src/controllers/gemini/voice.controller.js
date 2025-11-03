// src/controllers/gemini/voice.controller.js

const geminiClient = require('../../services/gemini/geminiClient.service');
const conversationService = require('../../services/database/conversation.service');
const messageService = require('../../services/database/message.service');
const fileStorageService = require('../../services/utils/fileStorage.service');
const fs = require('fs').promises;
const path = require('path');

class VoiceController {
  /**
   * Procesa audio: transcribe y genera respuesta
   */
  async processVoice(req, res, next) {
    let audioPath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un archivo de audio'
        });
      }

      const { conversationId, language, prompt } = req.body;
      const userId = req.userId;
      audioPath = req.file.path;

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
        const title = 'Audio: Transcripcion y respuesta';
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['voice', 'audio', 'transcription']
        });
      }

      const audioBuffer = await fs.readFile(audioPath);
      const mimeType = this.getAudioMimeType(req.file.mimetype, audioPath);

      const audioPart = geminiClient.fileToGenerativePart(audioBuffer, mimeType);

      let transcriptionPrompt = 'Transcribe este audio y proporciona el texto exacto.';
      if (language && language !== 'auto') {
        const languages = {
          es: 'español',
          en: 'ingles',
          fr: 'frances',
          de: 'aleman',
          it: 'italiano',
          pt: 'portugues'
        };
        transcriptionPrompt = `Transcribe este audio en ${languages[language] || 'español'}.`;
      }

      const parts = [
        { text: transcriptionPrompt },
        audioPart
      ];

      const transcriptionResult = await geminiClient.generateMultimodalContent(parts, {
        temperature: 0.1
      });

      const transcription = transcriptionResult.text.trim();

      if (!transcription || transcription.length === 0) {
        await fileStorageService.deleteFile(audioPath);
        return res.status(400).json({
          success: false,
          message: 'No se pudo transcribir el audio o el audio esta vacio'
        });
      }

      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: transcription,
        type: 'voice',
        attachments: [{
          type: 'audio',
          url: audioPath,
          name: req.file.originalname,
          mimeType: mimeType,
          size: req.file.size
        }],
        tokens: await geminiClient.countTokens(transcription)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        userMessage._id
      );

      let responsePrompt = transcription;
      if (prompt) {
        responsePrompt = `Transcripcion: "${transcription}"\n\nInstruccion adicional: ${prompt}`;
      }

      const responseResult = await geminiClient.generateContent(responsePrompt, {
        temperature: 0.7
      });

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: responseResult.text,
        type: 'voice',
        tokens: await geminiClient.countTokens(responseResult.text)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantMessage.tokens;
      await conversationService.updateTokenUsage(conversation._id, totalTokens);

      await fileStorageService.deleteFile(audioPath);

      return res.status(200).json({
        success: true,
        message: 'Audio procesado exitosamente',
        data: {
          transcription,
          response: responseResult.text,
          conversationId: conversation._id,
          messageId: assistantMessage._id,
          tokens: {
            prompt: userMessage.tokens,
            completion: assistantMessage.tokens,
            total: totalTokens
          },
          metadata: {
            model: geminiClient.model,
            language: language || 'auto',
            audioFormat: mimeType,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      if (audioPath) {
        await fileStorageService.deleteFile(audioPath);
      }
      
      console.error('Error en processVoice:', error);
      return res.status(500).json({
        success: false,
        message: 'Error procesando audio',
        error: error.message
      });
    }
  }

  /**
   * Solo transcribe el audio sin generar respuesta
   */
  async transcribeOnly(req, res, next) {
    let audioPath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un archivo de audio'
        });
      }

      audioPath = req.file.path;

      const audioBuffer = await fs.readFile(audioPath);
      const mimeType = this.getAudioMimeType(req.file.mimetype, audioPath);

      const audioPart = geminiClient.fileToGenerativePart(audioBuffer, mimeType);

      const parts = [
        { text: 'Transcribe este audio y proporciona solo el texto exacto sin comentarios adicionales.' },
        audioPart
      ];

      const result = await geminiClient.generateMultimodalContent(parts, {
        temperature: 0.1
      });

      const transcription = result.text.trim();

      await fileStorageService.deleteFile(audioPath);

      if (!transcription || transcription.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo transcribir el audio o el audio esta vacio'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Audio transcrito exitosamente',
        data: {
          transcription,
          metadata: {
            model: geminiClient.model,
            audioFormat: mimeType,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      if (audioPath) {
        await fileStorageService.deleteFile(audioPath);
      }
      
      console.error('Error en transcribeOnly:', error);
      return res.status(500).json({
        success: false,
        message: 'Error transcribiendo audio',
        error: error.message
      });
    }
  }

  /**
   * Analiza el audio con instrucciones especificas
   */
  async analyzeVoice(req, res, next) {
    let audioPath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un archivo de audio'
        });
      }

      const { instruction, conversationId } = req.body;
      const userId = req.userId;
      audioPath = req.file.path;

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
        const title = `Audio: ${instruction.substring(0, 40)}...`;
        conversation = await conversationService.createConversation({
          userId,
          title,
          tags: ['voice', 'audio', 'analysis']
        });
      }

      const audioBuffer = await fs.readFile(audioPath);
      const mimeType = this.getAudioMimeType(req.file.mimetype, audioPath);

      const audioPart = geminiClient.fileToGenerativePart(audioBuffer, mimeType);

      const transcriptionParts = [
        { text: 'Transcribe este audio exactamente.' },
        audioPart
      ];

      const transcriptionResult = await geminiClient.generateMultimodalContent(transcriptionParts, {
        temperature: 0.1
      });

      const transcription = transcriptionResult.text.trim();

      if (!transcription || transcription.length === 0) {
        await fileStorageService.deleteFile(audioPath);
        return res.status(400).json({
          success: false,
          message: 'No se pudo transcribir el audio o el audio esta vacio'
        });
      }

      const userMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'user',
        content: `${instruction}\n\n[Audio: ${transcription}]`,
        type: 'voice',
        attachments: [{
          type: 'audio',
          url: audioPath,
          name: req.file.originalname,
          mimeType: mimeType,
          size: req.file.size
        }],
        tokens: await geminiClient.countTokens(instruction + transcription)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        userMessage._id
      );

      const analysisPrompt = `Transcripcion del audio: "${transcription}"\n\nInstruccion: ${instruction}`;

      const analysisResult = await geminiClient.generateContent(analysisPrompt, {
        temperature: 0.7
      });

      const assistantMessage = await messageService.createMessage({
        conversationId: conversation._id,
        role: 'assistant',
        content: analysisResult.text,
        type: 'voice',
        tokens: await geminiClient.countTokens(analysisResult.text)
      });

      await conversationService.addMessageToConversation(
        conversation._id,
        assistantMessage._id
      );

      const totalTokens = userMessage.tokens + assistantMessage.tokens;
      await conversationService.updateTokenUsage(conversation._id, totalTokens);

      await fileStorageService.deleteFile(audioPath);

      return res.status(200).json({
        success: true,
        message: 'Audio analizado exitosamente',
        data: {
          transcription,
          analysis: analysisResult.text,
          conversationId: conversation._id,
          messageId: assistantMessage._id,
          tokens: {
            prompt: userMessage.tokens,
            completion: assistantMessage.tokens,
            total: totalTokens
          },
          metadata: {
            model: geminiClient.model,
            audioFormat: mimeType,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      if (audioPath) {
        await fileStorageService.deleteFile(audioPath);
      }
      
      console.error('Error en analyzeVoice:', error);
      return res.status(500).json({
        success: false,
        message: 'Error analizando audio',
        error: error.message
      });
    }
  }

  /**
   * Obtiene el tipo MIME correcto del audio
   */
  getAudioMimeType(fileMimeType, filePath) {
    if (fileMimeType && fileMimeType.startsWith('audio/')) {
      const normalized = fileMimeType.toLowerCase();
      if (normalized === 'audio/mpeg3' || normalized === 'audio/x-mpeg-3') {
        return 'audio/mpeg';
      }
      if (normalized === 'audio/wave' || normalized === 'audio/x-wav') {
        return 'audio/wav';
      }
      if (normalized === 'audio/x-m4a') {
        return 'audio/mp4';
      }
      if (normalized === 'audio/x-flac') {
        return 'audio/flac';
      }
      return fileMimeType;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
      '.m4a': 'audio/mp4',
      '.opus': 'audio/opus',
      '.flac': 'audio/flac'
    };

    return mimeTypes[ext] || 'audio/mpeg';
  }
}

const controller = new VoiceController();

module.exports = {
  processVoice: (req, res, next) => controller.processVoice(req, res, next),
  transcribeOnly: (req, res, next) => controller.transcribeOnly(req, res, next),
  analyzeVoice: (req, res, next) => controller.analyzeVoice(req, res, next)
};