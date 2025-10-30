// src/controllers/gemini/pdf.controller.js

const pdfParserService = require('../../services/processing/pdfParser.service');
const textGenerationService = require('../../services/gemini/textGeneration.service');
const fileStorageService = require('../../services/utils/fileStorage.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/gemini/pdf:
 *   post:
 *     summary: Analizar documento PDF
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
 *               - pdf
 *               - prompt
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *                 description: Documento PDF a analizar
 *               prompt:
 *                 type: string
 *                 example: Resume el contenido de este documento
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: PDF analizado exitosamente
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
const analyzePDF = async (req, res, next) => {
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
        message: 'Se requiere un archivo PDF'
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;
    const pdfPath = req.file.path;

    try {
      const extractedText = await pdfParserService.extractTextFromPDF(pdfPath);

      if (!extractedText || extractedText.trim().length === 0) {
        await fileStorageService.deleteFile(pdfPath);
        
        return res.status(400).json({
          success: false,
          message: 'No se pudo extraer texto del PDF o el PDF esta vacio'
        });
      }

      const fullPrompt = `Contenido del documento PDF:\n\n${extractedText}\n\nPregunta: ${prompt}`;

      const result = await textGenerationService.generateText({
        prompt: fullPrompt,
        userId,
        conversationId,
        config
      });

      await fileStorageService.deleteFile(pdfPath);

      res.status(200).json({
        success: true,
        message: 'PDF analizado exitosamente',
        data: {
          response: result.response,
          conversationId: result.conversationId,
          tokens: result.tokens,
          metadata: {
            pdfSize: req.file.size,
            extractedTextLength: extractedText.length
          }
        }
      });
    } catch (error) {
      await fileStorageService.deleteFile(pdfPath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/pdf/extract:
 *   post:
 *     summary: Solo extraer texto del PDF sin analisis
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
 *               - pdf
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Texto extraido exitosamente
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
 *                     text:
 *                       type: string
 *                     metadata:
 *                       type: object
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const extractPDFText = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un archivo PDF'
      });
    }

    const pdfPath = req.file.path;

    try {
      const extractedData = await pdfParserService.extractFullPDFData(pdfPath);

      await fileStorageService.deleteFile(pdfPath);

      if (!extractedData.text || extractedData.text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo extraer texto del PDF o el PDF esta vacio'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Texto extraido exitosamente',
        data: {
          text: extractedData.text,
          metadata: {
            numPages: extractedData.numPages,
            info: extractedData.info,
            textLength: extractedData.text.length
          }
        }
      });
    } catch (error) {
      await fileStorageService.deleteFile(pdfPath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/pdf/summarize:
 *   post:
 *     summary: Resumir documento PDF automaticamente
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
 *               - pdf
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *               summaryLength:
 *                 type: string
 *                 enum: [short, medium, long]
 *                 default: medium
 *                 example: medium
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: PDF resumido exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const summarizePDF = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un archivo PDF'
      });
    }

    const { summaryLength = 'medium', conversationId, config } = req.body;
    const userId = req.user.id;
    const pdfPath = req.file.path;

    try {
      const extractedText = await pdfParserService.extractTextFromPDF(pdfPath);

      if (!extractedText || extractedText.trim().length === 0) {
        await fileStorageService.deleteFile(pdfPath);
        
        return res.status(400).json({
          success: false,
          message: 'No se pudo extraer texto del PDF o el PDF esta vacio'
        });
      }

      const summaryInstructions = {
        short: 'Resume el siguiente documento en 3-5 puntos clave',
        medium: 'Proporciona un resumen detallado del siguiente documento, destacando los puntos principales y conclusiones',
        long: 'Crea un resumen extenso y detallado del siguiente documento, incluyendo todos los puntos importantes, argumentos principales y conclusiones'
      };

      const instruction = summaryInstructions[summaryLength] || summaryInstructions.medium;
      const fullPrompt = `${instruction}:\n\n${extractedText}`;

      const result = await textGenerationService.generateText({
        prompt: fullPrompt,
        userId,
        conversationId,
        config
      });

      await fileStorageService.deleteFile(pdfPath);

      res.status(200).json({
        success: true,
        message: 'PDF resumido exitosamente',
        data: {
          summary: result.response,
          conversationId: result.conversationId,
          tokens: result.tokens,
          metadata: {
            summaryLength,
            originalTextLength: extractedText.length
          }
        }
      });
    } catch (error) {
      await fileStorageService.deleteFile(pdfPath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/pdf/query:
 *   post:
 *     summary: Hacer preguntas especificas sobre el contenido del PDF
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
 *               - pdf
 *               - questions
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *               questions:
 *                 type: string
 *                 example: "1. Cual es el tema principal? 2. Cuales son las conclusiones?"
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Preguntas respondidas exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const queryPDF = async (req, res, next) => {
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
        message: 'Se requiere un archivo PDF'
      });
    }

    const { questions, conversationId, config } = req.body;
    const userId = req.user.id;
    const pdfPath = req.file.path;

    try {
      const extractedText = await pdfParserService.extractTextFromPDF(pdfPath);

      if (!extractedText || extractedText.trim().length === 0) {
        await fileStorageService.deleteFile(pdfPath);
        
        return res.status(400).json({
          success: false,
          message: 'No se pudo extraer texto del PDF o el PDF esta vacio'
        });
      }

      const fullPrompt = `Basandote en el siguiente documento, responde las siguientes preguntas:\n\nDocumento:\n${extractedText}\n\nPreguntas:\n${questions}`;

      const result = await textGenerationService.generateText({
        prompt: fullPrompt,
        userId,
        conversationId,
        config
      });

      await fileStorageService.deleteFile(pdfPath);

      res.status(200).json({
        success: true,
        message: 'Preguntas respondidas exitosamente',
        data: {
          answers: result.response,
          conversationId: result.conversationId,
          tokens: result.tokens
        }
      });
    } catch (error) {
      await fileStorageService.deleteFile(pdfPath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzePDF,
  extractPDFText,
  summarizePDF,
  queryPDF
};