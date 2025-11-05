// src/routes/auth/auth.routes.js

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/auth/authenticate');
const { 
  registerValidation, 
  loginValidation,
  changePasswordValidation,
} = require('../../middlewares/validation');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { registerLimiter, authLimiter } = require('../../middlewares/rateLimiter');
const { authAttemptLogger } = require('../../middlewares/requestLogger');

const { register } = require('../../controllers/auth/register.controller');
const { login } = require('../../controllers/auth/login.controller');
const { logout, logoutAll } = require('../../controllers/auth/logout.controller');
const { getProfile, updateProfile, changePassword } = require('../../controllers/auth/profile.controller');
const { forgotPassword, resetPassword } = require('../../controllers/auth/password.controller');
const { verifyEmail, resendVerificationEmail } = require('../../controllers/auth/verify-email.controller');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario del TecNM Campus Ensenada
 *     description: Crea una nueva cuenta de alumno en el sistema. Se enviara un email de verificacion.
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
 *                 description: Numero de control del alumno (8 digitos)
 *                 example: "23760194"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Contrasena del usuario (minimo 6 caracteres)
 *                 example: "Password123"
 *               nombreCompleto:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Nombre completo del alumno
 *                 example: "Juan Perez Lopez"
 *               carrera:
 *                 type: string
 *                 description: Carrera del alumno
 *                 example: "Ingenieria en Sistemas Computacionales"
 *               semestre:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 description: Semestre actual del alumno (1-12)
 *                 example: 5
 *               telefono:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *                 description: Numero de telefono de 10 digitos (opcional)
 *                 example: "6461234567"
 *               avatar:
 *                 type: string
 *                 description: Imagen de perfil en formato base64 (opcional)
 *     responses:
 *       201:
 *         description: Usuario registrado. Se envio email de verificacion.
 *       400:
 *         description: Error de validacion o datos invalidos
 *       409:
 *         description: El numero de control o email ya existe
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
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Verificar cuenta de email
 *     description: Verifica la cuenta del usuario usando el token enviado por email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de verificacion recibido por email
 *     responses:
 *       200:
 *         description: Cuenta verificada exitosamente
 *       400:
 *         description: Token invalido o expirado
 */
router.get(
  '/verify-email/:token',
  asyncHandler(verifyEmail)
);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Reenviar email de verificacion
 *     description: Envia nuevamente el email de verificacion a una cuenta no verificada
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
 *         description: Email enviado exitosamente
 *       400:
 *         description: La cuenta ya esta verificada
 */
router.post(
  '/resend-verification',
  authLimiter,
  asyncHandler(resendVerificationEmail)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesion
 *     description: Autentica un usuario verificado del TecNM
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
 *                 description: Contrasena del usuario
 *                 example: "Password123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales invalidas o cuenta no verificada
 */
router.post(
  '/login',
  authLimiter,
  authAttemptLogger,
  loginValidation,
  asyncHandler(login)
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(logout)
);

router.post(
  '/logout-all',
  authenticate,
  asyncHandler(logoutAll)
);

router.get(
  '/profile',
  authenticate,
  asyncHandler(getProfile)
);

router.put(
  '/profile',
  authenticate,
  asyncHandler(updateProfile)
);

router.post(
  '/change-password',
  authenticate,
  authLimiter,
  changePasswordValidation,
  asyncHandler(changePassword)
);

router.get(
  '/me',
  authenticate,
  asyncHandler(getProfile)
);

router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(forgotPassword)
);

router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(resetPassword)
);

module.exports = router;