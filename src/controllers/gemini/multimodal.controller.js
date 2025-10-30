// src/controllers/gemini/multimodal.controller.js

const visionAnalysisService = require('../../services/gemini/visionAnalysis.service');
const imageProcessorService = require('../../services/processing/imageProcessor.service');
const streamResponseService = require('../../services/gemini/streamResponse.service');
const fileStorageService = require('../../services/utils/fileStorage.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/gemini/multimodal:
 *   post:
 *     summary: Analisis multimodal con texto e imagenes
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
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Analiza estas imagenes y dimelo que representan
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Analisis multimodal exitoso
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
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const processMultimodal = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;
    const files = req.files || [];

    if (!prompt && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un prompt o una imagen'
      });
    }

    const imagePaths = files.map(file => file.path);

    try {
      let processedImages = [];
      
      if (files.length > 0) {
        processedImages = await Promise.all(
          imagePaths.map(path => imageProcessorService.processImage(path))
        );
      }

      const result = await visionAnalysisService.analyzeMultimodal({
        prompt,
        imagePaths: processedImages.map(img => img.path),
        userId,
        conversationId,
        config
      });

      await Promise.all(imagePaths.map(path => fileStorageService.deleteFile(path)));
      await Promise.all(
        processedImages
          .filter(img => !imagePaths.includes(img.path))
          .map(img => fileStorageService.deleteFile(img.path))
      );

      res.status(200).json({
        success: true,
        message: 'Analisis multimodal exitoso',
        data: result
      });
    } catch (error) {
      await Promise.all(imagePaths.map(path => fileStorageService.deleteFile(path)));
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/multimodal/stream:
 *   post:
 *     summary: Analisis multimodal con streaming
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
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Describe detalladamente estas imagenes
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Stream de respuesta multimodal
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const processMultimodalStream = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;
    const files = req.files || [];

    if (!prompt && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un prompt o una imagen'
      });
    }

    const imagePaths = files.map(file => file.path);

    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let processedImages = [];
      
      if (files.length > 0) {
        processedImages = await Promise.all(
          imagePaths.map(path => imageProcessorService.processImage(path))
        );
      }

      const fileParts = processedImages.map((img, index) => ({
        type: 'image',
        path: img.path,
        name: files[index].originalname,
        part: img.part
      }));

      const onChunk = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const result = await streamResponseService.streamMultimodal({
        prompt,
        files: fileParts,
        userId,
        conversationId,
        onChunk,
        config
      });

      await Promise.all(imagePaths.map(path => fileStorageService.deleteFile(path)));
      await Promise.all(
        processedImages
          .filter(img => !imagePaths.includes(img.path))
          .map(img => fileStorageService.deleteFile(img.path))
      );

      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        result 
      })}\n\n`);
      
      res.end();
    } catch (error) {
      await Promise.all(imagePaths.map(path => fileStorageService.deleteFile(path)));
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error.message 
      })}\n\n`);
      res.end();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/multimodal/compare:
 *   post:
 *     summary: Comparar multiples imagenes con un criterio especifico
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
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               criteria:
 *                 type: string
 *                 example: Compara la calidad y composicion de estas imagenes
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Comparacion exitosa
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const compareImages = async (req, res, next) => {
  try {
    const files = req.files || [];

    if (files.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren al menos 2 imagenes para comparar'
      });
    }

    const { criteria, conversationId, config } = req.body;
    const userId = req.user.id;
    const imagePaths = files.map(file => file.path);

    try {
      const processedImages = await Promise.all(
        imagePaths.map(path => imageProcessorService.processImage(path))
      );

      const prompt = criteria || 'Compara estas imagenes y describe sus similitudes y diferencias';

      const result = await visionAnalysisService.analyzeMultimodal({
        prompt,
        imagePaths: processedImages.map(img => img.path),
        userId,
        conversationId,
        config
      });

      await Promise.all(imagePaths.map(path => fileStorageService.deleteFile(path)));
      await Promise.all(
        processedImages
          .filter(img => !imagePaths.includes(img.path))
          .map(img => fileStorageService.deleteFile(img.path))
      );

      res.status(200).json({
        success: true,
        message: 'Comparacion exitosa',
        data: result
      });
    } catch (error) {
      await Promise.all(imagePaths.map(path => fileStorageService.deleteFile(path)));
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processMultimodal,
  processMultimodalStream,
  compareImages
};