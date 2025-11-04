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
  changePassword,
  getUserByNumeroControl,
  getUsersByCarrera,
  updatePreferences,
  getUserStats
} = require('../../controllers/auth/profile.controller');

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         numeroControl:
 *                           type: string
 *                           example: "23760194"
 *                         email:
 *                           type: string
 *                           example: "23760194@ite.edu.mx"
 *                         nombreCompleto:
 *                           type: string
 *                           example: "Juan Perez Lopez"
 *                         carrera:
 *                           type: string
 *                           example: "Ingenieria en Sistemas Computacionales"
 *                         semestre:
 *                           type: number
 *                           example: 5
 *                         avatar:
 *                           type: string
 *                           nullable: true
 *                         telefono:
 *                           type: string
 *                           nullable: true
 *                           example: "6461234567"
 *                         role:
 *                           type: string
 *                           enum: [alumno, profesor, admin]
 *                         isActive:
 *                           type: boolean
 *                         isVerified:
 *                           type: boolean
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
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
 *               nombreCompleto:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "Juan Perez Lopez"
 *               carrera:
 *                 type: string
 *                 example: "Ingenieria en Sistemas Computacionales"
 *               semestre:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 5
 *               avatar:
 *                 type: string
 *                 description: Base64 encoded image (data:image/png;base64,...)
 *                 nullable: true
 *               telefono:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *                 example: "6461234567"
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       400:
 *         description: Datos invalidos o numero de control/email no se puede modificar
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
 *     summary: Cambiar contraseña del usuario
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
 *                 minLength: 6
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *               confirmPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Contraseña actual incorrecta o validacion fallida
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
 *                 example: "dark"
 *               language:
 *                 type: string
 *                 enum: [es, en, fr, de, pt]
 *                 example: "es"
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         theme:
 *                           type: string
 *                         language:
 *                           type: string
 *       400:
 *         description: Debe proporcionar al menos una preferencia
 *       401:
 *         description: No autorizado
 */
router.put(
  '/preferences',
  authenticate,
  asyncHandler(updatePreferences)
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: No autorizado
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(getUserStats)
);

/**
 * @swagger
 * /api/user/numero-control/{numeroControl}:
 *   get:
 *     summary: Obtener usuario por numero de control (Solo Admin)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: numeroControl
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^\\d{8}$"
 *         description: Numero de control del alumno (8 digitos)
 *         example: "23760194"
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado (solo administradores)
 */
router.get(
  '/numero-control/:numeroControl',
  authenticate,
  asyncHandler(getUserByNumeroControl)
);

/**
 * @swagger
 * /api/user/carrera/{carrera}:
 *   get:
 *     summary: Listar usuarios por carrera (Solo Admin/Profesor)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carrera
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de la carrera
 *         example: "Ingenieria en Sistemas Computacionales"
 *       - in: query
 *         name: semestre
 *         required: false
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 12
 *         description: Filtrar por semestre especifico
 *         example: 5
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: number
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado (solo administradores o profesores)
 */
router.get(
  '/carrera/:carrera',
  authenticate,
  asyncHandler(getUsersByCarrera)
);

module.exports = router;