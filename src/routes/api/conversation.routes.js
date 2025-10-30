// src/routes/api/conversation.routes.js

const express = require('express');
const router = express.Router();

// Middlewares - IMPORTACION CORRECTA CON DESTRUCTURING
const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { body, param, query, validationResult } = require('express-validator');

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

// Importar controladores
const {
  getAllConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  searchConversations
} = require('../../controllers/conversation.controller');

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Obtener conversaciones
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim(),
  validate,
  asyncHandler(getAllConversations)
);

/**
 * @swagger
 * /api/conversations/search:
 *   get:
 *     summary: Buscar conversaciones
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/search',
  authenticate,
  query('q').notEmpty().isString().trim(),
  validate,
  asyncHandler(searchConversations)
);

/**
 * @swagger
 * /api/conversations/{id}:
 *   get:
 *     summary: Obtener conversacion por ID
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id',
  authenticate,
  param('id').isMongoId(),
  validate,
  asyncHandler(getConversationById)
);

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Crear conversacion
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  body('title').notEmpty().isString().trim().isLength({ min: 1, max: 200 }),
  body('tags').optional().isArray(),
  validate,
  asyncHandler(createConversation)
);

/**
 * @swagger
 * /api/conversations/{id}:
 *   put:
 *     summary: Actualizar conversacion
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticate,
  param('id').isMongoId(),
  body('title').optional().isString().trim(),
  body('tags').optional().isArray(),
  validate,
  asyncHandler(updateConversation)
);

/**
 * @swagger
 * /api/conversations/{id}:
 *   delete:
 *     summary: Eliminar conversacion
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  authenticate,
  param('id').isMongoId(),
  validate,
  asyncHandler(deleteConversation)
);

module.exports = router;