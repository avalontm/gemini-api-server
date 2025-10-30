// src/controllers/export.controller.js

const conversationService = require('../services/database/conversation.service');
const messageService = require('../services/database/message.service');
const exportPDFService = require('../services/utils/exportPDF.service');
const exportTXTService = require('../services/utils/exportTXT.service');

/**
 * @swagger
 * /api/export/{conversationId}/pdf:
 *   get:
 *     summary: Exportar conversacion como PDF
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversacion
 *     responses:
 *       200:
 *         description: PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Conversacion no encontrada
 *       500:
 *         description: Error del servidor
 */
const exportConversationPDF = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    const messages = await messageService.getMessagesByConversation(conversationId);

    const pdfBuffer = await exportPDFService.generatePDF({
      conversation,
      messages,
      user: req.user
    });

    const filename = `conversacion_${conversationId}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/export/{conversationId}/txt:
 *   get:
 *     summary: Exportar conversacion como TXT
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversacion
 *     responses:
 *       200:
 *         description: TXT generado exitosamente
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Conversacion no encontrada
 *       500:
 *         description: Error del servidor
 */
const exportConversationTXT = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    const messages = await messageService.getMessagesByConversation(conversationId);

    const txtContent = exportTXTService.generateTXT({
      conversation,
      messages,
      user: req.user
    });

    const filename = `conversacion_${conversationId}_${Date.now()}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(txtContent);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/export/{conversationId}/json:
 *   get:
 *     summary: Exportar conversacion como JSON
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversacion
 *     responses:
 *       200:
 *         description: JSON generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Conversacion no encontrada
 *       500:
 *         description: Error del servidor
 */
const exportConversationJSON = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    const messages = await messageService.getMessagesByConversation(conversationId);

    const exportData = {
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
      })),
      exportedAt: new Date(),
      exportedBy: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      }
    };

    const filename = `conversacion_${conversationId}_${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(exportData);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/export/all/{format}:
 *   get:
 *     summary: Exportar todas las conversaciones del usuario
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [json, txt]
 *         description: Formato de exportacion
 *     responses:
 *       200:
 *         description: Exportacion exitosa
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const exportAllConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { format } = req.params;

    if (!['json', 'txt'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Formato no valido. Use json o txt'
      });
    }

    const conversationsData = await conversationService.getUserConversations(userId, {
      page: 1,
      limit: 1000
    });

    const conversations = conversationsData.conversations;

    const exportData = [];

    for (const conv of conversations) {
      const messages = await messageService.getMessagesByConversation(conv._id);
      exportData.push({
        conversation: conv,
        messages
      });
    }

    const timestamp = Date.now();
    const filename = `todas_conversaciones_${timestamp}.${format}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.json({
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email
        },
        totalConversations: conversations.length,
        exportedAt: new Date(),
        data: exportData
      });
    } else if (format === 'txt') {
      const txtContent = exportTXTService.generateBulkTXT({
        conversations: exportData,
        user: req.user
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(txtContent);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportConversationPDF,
  exportConversationTXT,
  exportConversationJSON,
  exportAllConversations
};