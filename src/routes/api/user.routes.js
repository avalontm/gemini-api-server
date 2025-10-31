// src/routes/api/user.routes.js

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { 
  updateProfileValidation,
  changePasswordValidation 
} = require('../../middlewares/validation');

const { 
  getProfile, 
  updateProfile, 
  changePassword 
} = require('../../controllers/auth/profile.controller');

const userService = require('../../services/database/user.service');

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *       401:
 *         description: No autorizado
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler(getProfile)
);

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               avatar:
 *                 type: string
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 */
router.put(
  '/profile',
  authenticate,
  updateProfileValidation,
  asyncHandler(updateProfile)
);

/**
 * @swagger
 * /api/user/password:
 *   put:
 *     summary: Cambiar contrasena del usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contrasena actualizada exitosamente
 *       400:
 *         description: Contrasena actual incorrecta
 *       401:
 *         description: No autorizado
 */
router.put(
  '/password',
  authenticate,
  changePasswordValidation,
  asyncHandler(changePassword)
);

/**
 * @swagger
 * /api/user/preferences:
 *   put:
 *     summary: Actualizar preferencias del usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, auto]
 *               language:
 *                 type: string
 *                 enum: [es, en, fr, de, pt]
 *     responses:
 *       200:
 *         description: Preferencias actualizadas exitosamente
 *       401:
 *         description: No autorizado
 */
router.put(
  '/preferences',
  authenticate,
  asyncHandler(async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { theme, language } = req.body;

      const preferences = {};
      if (theme) preferences.theme = theme;
      if (language) preferences.language = language;

      const updatedUser = await userService.updateUserPreferences(userId, preferences);

      res.status(200).json({
        success: true,
        message: 'Preferencias actualizadas exitosamente',
        data: {
          preferences: updatedUser.preferences
        }
      });
    } catch (error) {
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/user/stats:
 *   get:
 *     summary: Obtener estadisticas del usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadisticas obtenidas exitosamente
 *       401:
 *         description: No autorizado
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res, next) => {
    try {
      const userId = req.user.id;
      const stats = await userService.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  })
);

module.exports = router;