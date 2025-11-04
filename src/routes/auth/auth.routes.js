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
 *                 enum:
 *                   - Ingeniería en Innovación Agrícola Sustentable
 *                   - Ingeniería Electromecánica
 *                   - Ingeniería Electrónica
 *                   - Ingeniería en Gestión Empresarial
 *                   - Ingeniería Industrial
 *                   - Ingeniería Mecatrónica
 *                   - Ingeniería en Sistemas Computacionales
 *                   - Licenciatura en Administración
 *                   - Ingeniería Industrial TecNM-Virtual
 *                   - Ingeniería en Sistemas Computacionales TecNM-Virtual
 *                   - Ingeniería Electromecánica en Playas de Rosarito
 *                   - Ingeniería Industrial en Playas de Rosarito
 *                   - Ingeniería en Sistemas Computacionales en Playas de Rosarito
 *                   - Licenciatura en Administración en Playas de Rosarito
 *                   - Ingeniería en Sistemas Computacionales en Tecate
 *                   - Ingeniería Industrial en Tecate
 *                   - Licenciatura en Administración en Tecate
 *                   - Especialización en Industria Aeroespacial
 *                   - Maestría en Ingeniería Aeroespacial
 *                   - Maestría en Ciencias en Ingeniería Mecatrónica
 *                   - Doctorado en Ciencias en Ingeniería Mecatrónica
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
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
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
 *                   example: "Usuario registrado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         numeroControl:
 *                           type: string
 *                           example: "23760194"
 *                         email:
 *                           type: string
 *                           example: "23760194@ite.edu.mx"
 *                         nombreCompleto:
 *                           type: string
 *                           example: "Juan Pérez López"
 *                         carrera:
 *                           type: string
 *                           example: "Ingeniería en Sistemas Computacionales"
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
 *                           example: "alumno"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isVerified:
 *                           type: boolean
 *                           example: false
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     token:
 *                       type: string
 *                       description: Token JWT para autenticación
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Error de validación o datos inválidos
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
 *                   example: "El número de control ya está registrado"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
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
 *               - numeroControl
 *               - password
 *             properties:
 *               numeroControl:
 *                 type: string
 *                 pattern: "^\\d{8}$"
 *                 description: Número de control del alumno (también se puede usar email)
 *                 example: "23760194"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email institucional (alternativa al número de control)
 *                 example: "23760194@ite.edu.mx"
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: "Password123"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inicio de sesión exitoso"
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
 *                         email:
 *                           type: string
 *                         nombreCompleto:
 *                           type: string
 *                         carrera:
 *                           type: string
 *                         semestre:
 *                           type: number
 *                         role:
 *                           type: string
 *                     token:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
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
 *                   example: "Credenciales inválidas"
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
 *                   example: "Sesión cerrada exitosamente"
 *       401:
 *         description: No autorizado - Token inválido o no proporcionado
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
 *     description: Cierra todas las sesiones activas del usuario autenticado en todos los dispositivos
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las sesiones cerradas exitosamente
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
 *                   example: "Todas las sesiones cerradas exitosamente"
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
 *                           example: "Juan Pérez López"
 *                         carrera:
 *                           type: string
 *                           example: "Ingeniería en Sistemas Computacionales"
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
 *                           example: "alumno"
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
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     description: Actualiza la información del perfil del usuario autenticado. No se puede modificar numeroControl ni email.
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
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Nombre completo del alumno
 *                 example: "Juan Pérez López"
 *               carrera:
 *                 type: string
 *                 description: Carrera del alumno
 *                 example: "Ingeniería en Sistemas Computacionales"
 *               semestre:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 description: Semestre actual
 *                 example: 6
 *               avatar:
 *                 type: string
 *                 description: Imagen de perfil en base64 (usar null para eliminar)
 *                 nullable: true
 *                 example: "data:image/png;base64,..."
 *               telefono:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *                 description: Teléfono de 10 dígitos (usar null para eliminar)
 *                 nullable: true
 *                 example: "6461234567"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Perfil actualizado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       400:
 *         description: Error de validación o intento de modificar campos inmutables
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
 *     description: Permite al usuario cambiar su contraseña actual proporcionando la contraseña antigua y la nueva
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
 *                 description: Contraseña actual del usuario
 *                 example: "OldPassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Nueva contraseña (mínimo 6 caracteres)
 *                 example: "NewPassword123"
 *               confirmPassword:
 *                 type: string
 *                 description: Confirmación de la nueva contraseña (opcional pero recomendado)
 *                 example: "NewPassword123"
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
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
 *                   example: "Contraseña actualizada exitosamente"
 *       400:
 *         description: Error de validación o contraseña actual incorrecta
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
 *                   example: "Contraseña actual incorrecta"
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
 *                     user:
 *                       type: object
 *       401:
 *         description: No autorizado
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(getProfile)
);

module.exports = router;