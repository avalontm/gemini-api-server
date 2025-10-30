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

// Controllers (se importaran cuando se creen)
// const { register } = require('../../controllers/auth/register.controller');
// const { login } = require('../../controllers/auth/login.controller');
// const { logout } = require('../../controllers/auth/logout.controller');
// const { getProfile, updateProfile } = require('../../controllers/auth/profile.controller');

// Placeholder controllers (reemplazar cuando se creen los reales)
const register = (req, res) => {
  res.status(501).json({ message: 'Register controller pendiente de implementacion' });
};

const login = (req, res) => {
  res.status(501).json({ message: 'Login controller pendiente de implementacion' });
};

const logout = (req, res) => {
  res.status(501).json({ message: 'Logout controller pendiente de implementacion' });
};

const getProfile = (req, res) => {
  res.status(501).json({ message: 'GetProfile controller pendiente de implementacion' });
};

const updateProfile = (req, res) => {
  res.status(501).json({ message: 'UpdateProfile controller pendiente de implementacion' });
};

const changePassword = (req, res) => {
  res.status(501).json({ message: 'ChangePassword controller pendiente de implementacion' });
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: Crea una nueva cuenta de usuario en el sistema
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
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
 *                     token:
 *                       type: string
 *       400:
 *         description: Error de validacion
 *       409:
 *         description: Usuario ya existe
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
 *     summary: Iniciar sesion
 *     description: Autentica un usuario y devuelve un token JWT
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
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *                     token:
 *                       type: string
 *       401:
 *         description: Credenciales invalidas
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
 *     summary: Cerrar sesion
 *     description: Invalida el token JWT actual y cierra la sesion del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
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
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     description: Devuelve la informacion del perfil del usuario autenticado
 *     tags: [Auth]
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
 *     description: Actualiza la informacion del perfil del usuario autenticado
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
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               avatar:
 *                 type: string
 *                 example: https://example.com/avatar.jpg
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
 *     summary: Cambiar contrasena
 *     description: Permite al usuario cambiar su contrasena actual
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
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPass123!
 *               newPassword:
 *                 type: string
 *                 example: NewPass123!
 *               confirmPassword:
 *                 type: string
 *                 example: NewPass123!
 *     responses:
 *       200:
 *         description: Contrasena cambiada exitosamente
 *       400:
 *         description: Error de validacion
 *       401:
 *         description: Contrasena actual incorrecta
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
 *     description: Devuelve la informacion basica del usuario autenticado (alias de /profile)
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

module.exports = router;