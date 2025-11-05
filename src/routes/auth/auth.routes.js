// src/routes/auth/auth.routes.js

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticate } = require('../../middlewares/auth/authenticate');
const { 
  registerValidation, 
  loginValidation,
  changePasswordValidation,
} = require('../../middlewares/validation');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { registerLimiter, authLimiter } = require('../../middlewares/rateLimiter');
const { authAttemptLogger } = require('../../middlewares/requestLogger');

// Controllers
const { register } = require('../../controllers/auth/register.controller');
const { login } = require('../../controllers/auth/login.controller');
const { logout, logoutAll } = require('../../controllers/auth/logout.controller');
const { getProfile, updateProfile, changePassword } = require('../../controllers/auth/profile.controller');
const { forgotPassword, resetPassword } = require('../../controllers/auth/password.controller');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario del TecNM Campus Ensenada
 *     description: Crea una nueva cuenta de alumno en el sistema del Tecnológico Nacional de México Campus Ensenada
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numeroControl
 *               - password
 *               - nombreCompleto
 *               - carrera
 *               - semestre
 *             properties:
 *               numeroControl:
 *                 type: string
 *                 pattern: "^\\d{8}$"
 *                 description: Número de control del alumno (8 dígitos)
 *                 example: "23760194"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Contraseña del usuario (mínimo 6 caracteres)
 *                 example: "Password123"
 *               nombreCompleto:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Nombre completo del alumno
 *                 example: "Juan Pérez López"
 *               carrera:
 *                 type: string
 *                 description: Carrera del alumno (debe ser una carrera válida del TecNM)
 *                 example: "Ingeniería en Sistemas Computacionales"
 *               semestre:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 description: Semestre actual del alumno (1-12)
 *                 example: 5
 *               telefono:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *                 description: Número de teléfono de 10 dígitos (opcional)
 *                 example: "6461234567"
 *               avatar:
 *                 type: string
 *                 description: Imagen de perfil en formato base64 (opcional)
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Error de validación o datos inválidos
 *       409:
 *         description: El número de control o email ya existe
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/register',
  registerLimiter,
  authAttemptLogger,
  registerValidation,
  asyncHandler(register)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario del TecNM y devuelve un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email institucional
 *                 example: "al23760194@ite.edu.mx"
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: "Password123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
router.post(
  '/login',
  authLimiter,
  authAttemptLogger,
  loginValidation,
  asyncHandler(login)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Invalida el token JWT actual y cierra la sesión del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 *       401:
 *         description: No autorizado
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(logout)
);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Cerrar todas las sesiones
 *     description: Cierra todas las sesiones activas del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las sesiones cerradas exitosamente
 *       401:
 *         description: No autorizado
 */
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(logoutAll)
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     description: Devuelve la información completa del perfil del usuario autenticado
 *     tags: [Auth]
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
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     description: Actualiza la información del perfil. No se puede modificar numeroControl ni email.
 *     tags: [Auth]
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
 *               carrera:
 *                 type: string
 *               semestre:
 *                 type: number
 *               avatar:
 *                 type: string
 *               telefono:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 */
router.put(
  '/profile',
  authenticate,
  asyncHandler(updateProfile)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Cambiar contraseña
 *     description: Permite cambiar la contraseña actual
 *     tags: [Auth]
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
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *       400:
 *         description: Contraseña actual incorrecta
 *       401:
 *         description: No autorizado
 */
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  changePasswordValidation,
  asyncHandler(changePassword)
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener usuario actual
 *     description: Devuelve la información del usuario autenticado (alias de /profile)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *       401:
 *         description: No autorizado
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(getProfile)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     description: Envia un email con instrucciones para restablecer la contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email institucional del usuario
 *                 example: "al23760194@ite.edu.mx"
 *     responses:
 *       200:
 *         description: Email enviado exitosamente (o email no existe pero no se revela)
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
 *                   example: "Si el correo existe, recibiras instrucciones para restablecer tu contraseña"
 *       400:
 *         description: Error de validacion
 *       500:
 *         description: Error al enviar el correo
 */
router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(forgotPassword)
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token
 *     description: Restablece la contraseña usando el token recibido por email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de restablecimiento recibido por email
 *                 example: "abc123def456..."
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Nueva contraseña (minimo 6 caracteres)
 *                 example: "NewPassword123"
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
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
 *                   example: "Contraseña restablecida exitosamente"
 *       400:
 *         description: Token invalido o expirado
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
 *                   example: "Token invalido o expirado"
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(resetPassword)
);

module.exports = router;