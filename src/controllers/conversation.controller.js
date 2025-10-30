// src/controllers/conversation.controller.js

const conversationService = require('../services/database/conversation.service');
const messageService = require('../services/database/message.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Obtener todas las conversaciones del usuario
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numero de pagina
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items por pagina
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filtrar por tag
 *     responses:
 *       200:
 *         description: Lista de conversaciones
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const getAllConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, tag } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      tag
    };

    const result = await conversationService.getUserConversations(userId, options);

    res.status(200).json({
      success: true,
      data: {
        conversations: result.conversations,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalConversations: result.totalConversations,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/conversations/{id}:
 *   get:
 *     summary: Obtener una conversacion especifica con sus mensajes
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversacion
 *     responses:
 *       200:
 *         description: Conversacion con mensajes
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Conversacion no encontrada
 *       500:
 *         description: Error del servidor
 */
const getConversationById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await conversationService.getConversationById(id, userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    const messages = await messageService.getMessagesByConversation(id);

    res.status(200).json({
      success: true,
      data: {
        conversation: {
          id: conversation._id,
          title: conversation.title,
          tags: conversation.tags,
          tokenUsage: conversation.tokenUsage,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt
        },
        messages: messages.map(msg => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          type: msg.type,
          attachments: msg.attachments,
          tokens: msg.tokens,
          createdAt: msg.createdAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Crear una nueva conversacion
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Mi nueva conversacion
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["trabajo", "importante"]
 *     responses:
 *       201:
 *         description: Conversacion creada exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const createConversation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { title, tags = [] } = req.body;

    const conversation = await conversationService.createConversation({
      userId,
      title,
      tags
    });

    res.status(201).json({
      success: true,
      message: 'Conversacion creada exitosamente',
      data: {
        conversation: {
          id: conversation._id,
          title: conversation.title,
          tags: conversation.tags,
          createdAt: conversation.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/conversations/{id}:
 *   put:
 *     summary: Actualizar una conversacion
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Conversacion actualizada
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Conversacion no encontrada
 *       500:
 *         description: Error del servidor
 */
const updateConversation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { title, tags } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (tags) updateData.tags = tags;

    const conversation = await conversationService.updateConversation(
      id,
      userId,
      updateData
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Conversacion actualizada exitosamente',
      data: {
        conversation: {
          id: conversation._id,
          title: conversation.title,
          tags: conversation.tags,
          updatedAt: conversation.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/conversations/{id}:
 *   delete:
 *     summary: Eliminar una conversacion
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversacion eliminada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Conversacion no encontrada
 *       500:
 *         description: Error del servidor
 */
const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await conversationService.deleteConversation(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    await messageService.deleteMessagesByConversation(id);

    res.status(200).json({
      success: true,
      message: 'Conversacion eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/conversations/search:
 *   get:
 *     summary: Buscar conversaciones por texto
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto a buscar
 *     responses:
 *       200:
 *         description: Resultados de busqueda
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const searchConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un termino de busqueda'
      });
    }

    const conversations = await conversationService.searchConversations(userId, q);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        count: conversations.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  searchConversations
};