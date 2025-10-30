// src/controllers/gemini/voice.controller.js

const audioProcessorService = require('../../services/processing/audioProcessor.service');
const textGenerationService = require('../../services/gemini/textGeneration.service');
const fileStorageService = require('../../services/utils/fileStorage.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/gemini/voice:
 *   post:
 *     summary: Transcribir audio y generar respuesta
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de audio a transcribir
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Audio transcrito y respuesta generada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Datos invalidos o archivo no valido
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const processVoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un archivo de audio'
      });
    }

    const { conversationId, config } = req.body;
    const userId = req.user.id;
    const audioPath = req.file.path;

    try {
      const processedAudio = await audioProcessorService.processAudio(audioPath);

      const transcription = await audioProcessorService.transcribeAudio(
        processedAudio.path
      );

      if (!transcription || transcription.trim().length === 0) {
        await fileStorageService.deleteFile(audioPath);
        if (processedAudio.path !== audioPath) {
          await fileStorageService.deleteFile(processedAudio.path);
        }

        return res.status(400).json({
          success: false,
          message: 'No se pudo transcribir el audio o el audio esta vacio'
        });
      }

      const result = await textGenerationService.generateText({
        prompt: transcription,
        userId,
        conversationId,
        config
      });

      await fileStorageService.deleteFile(audioPath);
      if (processedAudio.path !== audioPath) {
        await fileStorageService.deleteFile(processedAudio.path);
      }

      res.status(200).json({
        success: true,
        message: 'Audio procesado exitosamente',
        data: {
          transcription,
          response: result.response,
          conversationId: result.conversationId,
          tokens: result.tokens
        }
      });
    } catch (error) {
      await fileStorageService.deleteFile(audioPath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/voice/transcribe:
 *   post:
 *     summary: Solo transcribir audio sin generar respuesta
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Audio transcrito exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     transcription:
 *                       type: string
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const transcribeOnly = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un archivo de audio'
      });
    }

    const audioPath = req.file.path;

    try {
      const processedAudio = await audioProcessorService.processAudio(audioPath);

      const transcription = await audioProcessorService.transcribeAudio(
        processedAudio.path
      );

      await fileStorageService.deleteFile(audioPath);
      if (processedAudio.path !== audioPath) {
        await fileStorageService.deleteFile(processedAudio.path);
      }

      if (!transcription || transcription.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo transcribir el audio o el audio esta vacio'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Audio transcrito exitosamente',
        data: {
          transcription
        }
      });
    } catch (error) {
      await fileStorageService.deleteFile(audioPath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/voice/analyze:
 *   post:
 *     summary: Analizar contenido de audio con instrucciones especificas
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *               - instruction
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *               instruction:
 *                 type: string
 *                 example: Resume el contenido de este audio en 3 puntos
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Audio analizado exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const analyzeVoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un archivo de audio'
      });
    }

    const { instruction, conversationId, config } = req.body;
    const userId = req.user.id;
    const audioPath = req.file.path;

    try {
      const processedAudio = await audioProcessorService.processAudio(audioPath);

      const transcription = await audioProcessorService.transcribeAudio(
        processedAudio.path
      );

      if (!transcription || transcription.trim().length === 0) {
        await fileStorageService.deleteFile(audioPath);
        if (processedAudio.path !== audioPath) {
          await fileStorageService.deleteFile(processedAudio.path);
        }

        return res.status(400).json({
          success: false,
          message: 'No se pudo transcribir el audio o el audio esta vacio'
        });
      }

      const prompt = `Transcripcion del audio: "${transcription}"\n\nInstruccion: ${instruction}`;

      const result = await textGenerationService.generateText({
        prompt,
        userId,
        conversationId,
        config
      });

      await fileStorageService.deleteFile(audioPath);
      if (processedAudio.path !== audioPath) {
        await fileStorageService.deleteFile(processedAudio.path);
      }

      res.status(200).json({
        success: true,
        message: 'Audio analizado exitosamente',
        data: {
          transcription,
          analysis: result.response,
          conversationId: result.conversationId,
          tokens: result.tokens
        }
      });
    } catch (error) {
      await fileStorageService.deleteFile(audioPath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processVoice,
  transcribeOnly,
  analyzeVoice
};