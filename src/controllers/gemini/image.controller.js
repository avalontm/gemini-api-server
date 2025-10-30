// src/controllers/gemini/image.controller.js

const visionAnalysisService = require('../../services/gemini/visionAnalysis.service');
const imageProcessorService = require('../../services/processing/imageProcessor.service');
const fileStorageService = require('../../services/utils/fileStorage.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/gemini/image:
 *   post:
 *     summary: Analizar imagen con Gemini Vision
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
 *               - image
 *               - prompt
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagen a analizar
 *               prompt:
 *                 type: string
 *                 example: Describe lo que ves en esta imagen
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Imagen analizada exitosamente
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
const analyzeImage = async (req, res, next) => {
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
        message: 'Se requiere una imagen'
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;
    const imagePath = req.file.path;

    try {
      const processedImage = await imageProcessorService.processImage(imagePath);

      const result = await visionAnalysisService.analyzeImage({
        imagePath: processedImage.path,
        prompt,
        userId,
        conversationId,
        config
      });

      await fileStorageService.deleteFile(imagePath);
      if (processedImage.path !== imagePath) {
        await fileStorageService.deleteFile(processedImage.path);
      }

      res.status(200).json({
        success: true,
        message: 'Imagen analizada exitosamente',
        data: result
      });
    } catch (error) {
      await fileStorageService.deleteFile(imagePath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/gemini/image/batch:
 *   post:
 *     summary: Analizar multiples imagenes
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
 *               - prompt
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               prompt:
 *                 type: string
 *                 example: Compara estas imagenes y describe las diferencias
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Imagenes analizadas exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const analyzeMultipleImages = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren al menos una imagen'
      });
    }

    const { prompt, conversationId, config } = req.body;
    const userId = req.user.id;
    const imagePaths = req.files.map(file => file.path);

    try {
      const processedImages = await Promise.all(
        imagePaths.map(path => imageProcessorService.processImage(path))
      );

      const result = await visionAnalysisService.analyzeMultipleImages({
        imagePaths: processedImages.map(img => img.path),
        prompt,
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
        message: 'Imagenes analizadas exitosamente',
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
 * /api/gemini/image/describe:
 *   post:
 *     summary: Obtener descripcion detallada de una imagen
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
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               conversationId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Descripcion generada exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const describeImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una imagen'
      });
    }

    const { conversationId } = req.body;
    const userId = req.user.id;
    const imagePath = req.file.path;

    try {
      const processedImage = await imageProcessorService.processImage(imagePath);

      const result = await visionAnalysisService.describeImage({
        imagePath: processedImage.path,
        userId,
        conversationId
      });

      await fileStorageService.deleteFile(imagePath);
      if (processedImage.path !== imagePath) {
        await fileStorageService.deleteFile(processedImage.path);
      }

      res.status(200).json({
        success: true,
        message: 'Descripcion generada exitosamente',
        data: result
      });
    } catch (error) {
      await fileStorageService.deleteFile(imagePath);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeImage,
  analyzeMultipleImages,
  describeImage
};