// src/services/database/conversation.service.js

const Conversation = require('../../models/Conversation.model');
const Message = require('../../models/Message.model');

class ConversationService {
  /**
   * Crea una nueva conversacion
   * @param {Object} conversationData - Datos de la conversacion
   * @param {string} conversationData.userId - ID del usuario
   * @param {string} conversationData.title - Titulo de la conversacion
   * @param {Array} conversationData.tags - Tags opcionales
   * @returns {Promise<Object>} - Conversacion creada
   */
  async createConversation(conversationData) {
    try {
      const { userId, title, tags = [] } = conversationData;

      if (!userId || !title) {
        throw new Error('userId y title son requeridos');
      }

      const conversation = await Conversation.create({
        userId,
        title,
        tags,
        messages: [],
        tokenUsage: {
          total: 0,
          estimatedCost: 0
        }
      });

      return conversation;
    } catch (error) {
      throw new Error(`Error creando conversacion: ${error.message}`);
    }
  }

  /**
   * Obtiene una conversacion por ID
   * @param {string} conversationId - ID de la conversacion
   * @param {string} userId - ID del usuario (para verificar permisos)
   * @returns {Promise<Object|null>} - Conversacion encontrada
   */
  async getConversationById(conversationId, userId) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId
      }).populate('messages');

      return conversation;
    } catch (error) {
      throw new Error(`Error obteniendo conversacion: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las conversaciones de un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de paginacion y busqueda
   * @returns {Promise<Object>} - Conversaciones paginadas
   */
  async getUserConversations(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 10;
      const skip = (page - 1) * limit;
      const search = options.search || '';

      const query = { userId };

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }

      const conversations = await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-messages');

      const total = await Conversation.countDocuments(query);

      return {
        conversations,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error obteniendo conversaciones: ${error.message}`);
    }
  }

  /**
   * Actualiza una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @param {string} userId - ID del usuario
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} - Conversacion actualizada
   */
  async updateConversation(conversationId, userId, updates) {
    try {
      if (!conversationId || !userId) {
        throw new Error('conversationId y userId son requeridos');
      }

      const allowedUpdates = ['title', 'tags'];
      const updateKeys = Object.keys(updates);
      const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

      if (!isValidUpdate) {
        throw new Error('Actualizaciones no permitidas');
      }

      const conversation = await Conversation.findOneAndUpdate(
        { _id: conversationId, userId },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      return conversation;
    } catch (error) {
      throw new Error(`Error actualizando conversacion: ${error.message}`);
    }
  }

  /**
   * Elimina una conversacion y todos sus mensajes
   * @param {string} conversationId - ID de la conversacion
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} - true si se elimino exitosamente
   */
  async deleteConversation(conversationId, userId) {
    try {
      if (!conversationId || !userId) {
        throw new Error('conversationId y userId son requeridos');
      }

      await Message.deleteMany({ conversationId });

      const result = await Conversation.findOneAndDelete({
        _id: conversationId,
        userId
      });

      return !!result;
    } catch (error) {
      throw new Error(`Error eliminando conversacion: ${error.message}`);
    }
  }

  /**
   * Agrega un mensaje a una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<Object>} - Conversacion actualizada
   */
  async addMessageToConversation(conversationId, messageId) {
    try {
      if (!conversationId || !messageId) {
        throw new Error('conversationId y messageId son requeridos');
      }

      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { 
          $push: { messages: messageId },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );

      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      return conversation;
    } catch (error) {
      throw new Error(`Error agregando mensaje: ${error.message}`);
    }
  }

  /**
   * Actualiza el uso de tokens de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @param {number} tokens - Tokens a agregar
   * @returns {Promise<Object>} - Conversacion actualizada
   */
  async updateTokenUsage(conversationId, tokens) {
    try {
      if (!conversationId || tokens === undefined) {
        throw new Error('conversationId y tokens son requeridos');
      }

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      const newTotal = (conversation.tokenUsage?.total || 0) + tokens;
      const estimatedCost = newTotal * 0.00005;

      conversation.tokenUsage = {
        total: newTotal,
        estimatedCost: parseFloat(estimatedCost.toFixed(4))
      };

      await conversation.save();

      return conversation;
    } catch (error) {
      throw new Error(`Error actualizando tokens: ${error.message}`);
    }
  }

  /**
   * Obtiene estadisticas de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @returns {Promise<Object>} - Estadisticas de la conversacion
   */
  async getConversationStats(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        throw new Error('Conversacion no encontrada');
      }

      const messageCount = await Message.countDocuments({ conversationId });

      const messages = await Message.find({ conversationId });
      const userMessages = messages.filter(m => m.role === 'user').length;
      const assistantMessages = messages.filter(m => m.role === 'assistant').length;

      return {
        messageCount,
        userMessages,
        assistantMessages,
        tokenUsage: conversation.tokenUsage,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadisticas: ${error.message}`);
    }
  }

  /**
   * Busca conversaciones por tags
   * @param {string} userId - ID del usuario
   * @param {Array} tags - Tags a buscar
   * @returns {Promise<Array>} - Conversaciones encontradas
   */
  async getConversationsByTags(userId, tags) {
    try {
      if (!userId || !tags || !Array.isArray(tags)) {
        throw new Error('userId y tags son requeridos');
      }

      const conversations = await Conversation.find({
        userId,
        tags: { $in: tags }
      }).sort({ updatedAt: -1 });

      return conversations;
    } catch (error) {
      throw new Error(`Error buscando por tags: ${error.message}`);
    }
  }

  /**
   * Cuenta las conversaciones de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} - Total de conversaciones
   */
  async countUserConversations(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const count = await Conversation.countDocuments({ userId });
      return count;
    } catch (error) {
      throw new Error(`Error contando conversaciones: ${error.message}`);
    }
  }

  /**
   * Obtiene las conversaciones mas recientes de un usuario
   * @param {string} userId - ID del usuario
   * @param {number} limit - Numero de conversaciones a obtener
   * @returns {Promise<Array>} - Conversaciones recientes
   */
  async getRecentConversations(userId, limit = 5) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const conversations = await Conversation.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('-messages');

      return conversations;
    } catch (error) {
      throw new Error(`Error obteniendo conversaciones recientes: ${error.message}`);
    }
  }
}

module.exports = new ConversationService();