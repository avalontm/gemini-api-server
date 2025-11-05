// src/routes/api/apiKey.routes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');

const {
  getApiKeyInfo,
  setApiKey,
  validateApiKey,
  toggleApiKeyUsage,
  deleteApiKey,
  getApiKeyStats,
  updateApiKeyPreferences
} = require('../../controllers/auth/apiKey.controller');

/**
 * @swagger
 * /api/apikey/info:
 *   get:
 *     summary: Obtener informacion de la API key personal
 *     description: Retorna informacion enmascarada sobre la API key personal del usuario
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informacion obtenida exitosamente
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
 *                     hasApiKey:
 *                       type: boolean
 *                       description: Si el usuario tiene una API key configurada
 *                       example: true
 *                     isActive:
 *                       type: boolean
 *                       description: Si la API key esta activa y validada
 *                       example: true
 *                     isUsingPersonalKey:
 *                       type: boolean
 *                       description: Si actualmente esta usando su API key personal
 *                       example: true
 *                     lastValidated:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Ultima fecha de validacion
 *                     lastError:
 *                       type: string
 *                       nullable: true
 *                       description: Ultimo error de validacion si existe
 *                     apiKeyInfo:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         masked:
 *                           type: string
 *                           example: "AIzaSyAB...xyz1"
 *                           description: API key enmascarada
 *                         length:
 *                           type: number
 *                           example: 39
 *                         startsWithAIza:
 *                           type: boolean
 *                           example: true
 *                         isValid:
 *                           type: boolean
 *                           example: true
 *                     serverApiKeyAvailable:
 *                       type: boolean
 *                       description: Si el servidor tiene una API key configurada
 *                       example: true
 *       401:
 *         description: No autorizado
 */
router.get(
  '/info',
  authenticate,
  asyncHandler(getApiKeyInfo)
);

/**
 * @swagger
 * /api/apikey/set:
 *   post:
 *     summary: Configurar o actualizar API key personal
 *     description: Permite al usuario configurar su propia API key de Gemini. La API key sera validada antes de guardarse.
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: API key de Google Gemini (debe comenzar con AIza)
 *                 example: "AIzaSyABcDeFgHiJkLmNoPqRsTuVwXyZ1234567"
 *     responses:
 *       200:
 *         description: API key configurada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API key configurada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     apiKeyInfo:
 *                       type: object
 *                       properties:
 *                         masked:
 *                           type: string
 *                         length:
 *                           type: number
 *                     isActive:
 *                       type: boolean
 *                     isUsingPersonalKey:
 *                       type: boolean
 *                     lastValidated:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: API key invalida o error de validacion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "API key invalida"
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 *       401:
 *         description: No autorizado
 */
router.post(
  '/set',
  authenticate,
  [
    body('apiKey')
      .trim()
      .notEmpty()
      .withMessage('API key es requerida')
      .isLength({ min: 30 })
      .withMessage('API key debe tener al menos 30 caracteres')
  ],
  asyncHandler(setApiKey)
);

/**
 * @swagger
 * /api/apikey/validate:
 *   post:
 *     summary: Validar API key personal existente
 *     description: Valida la API key personal del usuario contra el servicio de Gemini
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Validacion completada
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
 *                     isValid:
 *                       type: boolean
 *                       description: Si la API key es valida
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "API key validada correctamente"
 *                     lastValidated:
 *                       type: string
 *                       format: date-time
 *                     model:
 *                       type: string
 *                       example: "gemini-2.0-flash-exp"
 *       400:
 *         description: No hay API key configurada
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error al desencriptar o validar
 */
router.post(
  '/validate',
  authenticate,
  asyncHandler(validateApiKey)
);

/**
 * @swagger
 * /api/apikey/toggle:
 *   post:
 *     summary: Activar o desactivar uso de API key personal
 *     description: Permite al usuario cambiar entre usar su API key personal o la del servidor
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usePersonalApiKey
 *             properties:
 *               usePersonalApiKey:
 *                 type: boolean
 *                 description: true para usar API key personal, false para usar la del servidor
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferencia actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Ahora se usara tu API key personal"
 *                 data:
 *                   type: object
 *                   properties:
 *                     usePersonalApiKey:
 *                       type: boolean
 *                     hasApiKey:
 *                       type: boolean
 *                     isActive:
 *                       type: boolean
 *       400:
 *         description: No hay API key configurada o no esta activa
 *       401:
 *         description: No autorizado
 */
router.post(
  '/toggle',
  authenticate,
  [
    body('usePersonalApiKey')
      .isBoolean()
      .withMessage('usePersonalApiKey debe ser un booleano')
  ],
  asyncHandler(toggleApiKeyUsage)
);

/**
 * @swagger
 * /api/apikey/delete:
 *   delete:
 *     summary: Eliminar API key personal
 *     description: Elimina permanentemente la API key personal del usuario
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API key eliminada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasApiKey:
 *                       type: boolean
 *                       example: false
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *                     usePersonalApiKey:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: No hay API key configurada
 *       401:
 *         description: No autorizado
 */
router.delete(
  '/delete',
  authenticate,
  asyncHandler(deleteApiKey)
);

/**
 * @swagger
 * /api/apikey/stats:
 *   get:
 *     summary: Obtener estadisticas de uso de API key
 *     description: Retorna informacion sobre el modo actual de uso y disponibilidad de API keys
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadisticas obtenidas exitosamente
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
 *                     currentMode:
 *                       type: string
 *                       enum: [personal, servidor]
 *                       description: Modo actual de API key en uso
 *                       example: "personal"
 *                     hasPersonalKey:
 *                       type: boolean
 *                       example: true
 *                     personalKeyActive:
 *                       type: boolean
 *                       example: true
 *                     hasServerKey:
 *                       type: boolean
 *                       example: true
 *                     canUseService:
 *                       type: boolean
 *                       description: Si puede usar el servicio de Gemini
 *                       example: true
 *                     lastValidated:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     lastError:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: No autorizado
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(getApiKeyStats)
);

/**
 * @swagger
 * /api/apikey/preferences:
 *   put:
 *     summary: Actualizar preferencias de API key
 *     description: Actualiza las preferencias relacionadas con el uso de API keys
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usePersonalApiKey:
 *                 type: boolean
 *                 description: Activar o desactivar uso de API key personal
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferencias actualizadas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Preferencias actualizadas"
 *                 data:
 *                   type: object
 *                   properties:
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         usePersonalApiKey:
 *                           type: boolean
 *       400:
 *         description: Error de validacion
 *       401:
 *         description: No autorizado
 */
router.put(
  '/preferences',
  authenticate,
  asyncHandler(updateApiKeyPreferences)
);

module.exports = router;