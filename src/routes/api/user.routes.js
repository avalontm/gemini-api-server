// src/routes/api/user.routes.js

const express = require('express');
const router = express.Router();

// Middlewares - IMPORTACION CORRECTA CON DESTRUCTURING
const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { body, validationResult } = require('express-validator');

// Middleware de validacion local
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validacion',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Placeholder controllers (TEMPORALES - hasta crear user.controller.js)
const getUserProfile = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'GetUserProfile controller pendiente de implementacion',
    userId: req.user ? req.user.id : 'N/A'
  });
};

const updateUserProfile = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'UpdateUserProfile controller pendiente de implementacion',
    userId: req.user ? req.user.id : 'N/A',
    data: req.body
  });
};

const updateUserPreferences = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'UpdateUserPreferences controller pendiente de implementacion',
    userId: req.user ? req.user.id : 'N/A',
    data: req.body
  });
};

const getUserStats = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'GetUserStats controller pendiente de implementacion',
    userId: req.user ? req.user.id : 'N/A'
  });
};

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Obtener perfil
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler(getUserProfile)
);

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Actualizar perfil
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/profile',
  authenticate,
  body('username').optional().isString().trim().isLength({ min: 3, max: 30 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('avatar').optional().isURL(),
  validate,
  asyncHandler(updateUserProfile)
);

/**
 * @swagger
 * /api/user/preferences:
 *   put:
 *     summary: Actualizar preferencias
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/preferences',
  authenticate,
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('language').optional().isIn(['es', 'en', 'fr', 'de', 'it', 'pt']),
  body('notifications').optional().isBoolean(),
  validate,
  asyncHandler(updateUserPreferences)
);

/**
 * @swagger
 * /api/user/stats:
 *   get:
 *     summary: Obtener estadisticas
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(getUserStats)
);

module.exports = router;