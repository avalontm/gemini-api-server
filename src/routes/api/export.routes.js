// src/routes/api/export.routes.js

const express = require('express');
const router = express.Router();

// Middlewares - IMPORTACION CORRECTA CON DESTRUCTURING
const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { param, query, validationResult } = require('express-validator');

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
  exportConversationPDF,
  exportConversationTXT,
  exportConversationJSON,
  exportAllConversations
} = require('../../controllers/export.controller');

/**
 * @swagger
 * /api/export/{conversationId}/pdf:
 *   get:
 *     summary: Exportar a PDF
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:conversationId/pdf',
  authenticate,
  param('conversationId').isMongoId(),
  query('includeMetadata').optional().isBoolean(),
  query('includeAttachments').optional().isBoolean(),
  validate,
  asyncHandler(exportConversationPDF)
);

/**
 * @swagger
 * /api/export/{conversationId}/txt:
 *   get:
 *     summary: Exportar a TXT
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:conversationId/txt',
  authenticate,
  param('conversationId').isMongoId(),
  query('includeMetadata').optional().isBoolean(),
  query('includeAttachments').optional().isBoolean(),
  validate,
  asyncHandler(exportConversationTXT)
);

/**
 * @swagger
 * /api/export/{conversationId}/json:
 *   get:
 *     summary: Exportar a JSON
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:conversationId/json',
  authenticate,
  param('conversationId').isMongoId(),
  query('includeMetadata').optional().isBoolean(),
  query('includeAttachments').optional().isBoolean(),
  validate,
  asyncHandler(exportConversationJSON)
);

/**
 * @swagger
 * /api/export/all/{format}:
 *   get:
 *     summary: Exportar todas las conversaciones
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/all/:format',
  authenticate,
  param('format').isIn(['json', 'txt']),
  validate,
  asyncHandler(exportAllConversations)
);

module.exports = router;