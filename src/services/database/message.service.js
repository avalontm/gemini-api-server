// src/services/database/message.service.js

const Message = require('../../models/Message.model');

class MessageService {
  /**
   * Crea un nuevo mensaje
   * @param {Object} messageData - Datos del mensaje
   * @param {string} messageData.conversationId - ID de la conversacion
   * @param {string} messageData.role - Rol (user o assistant)
   * @param {string} messageData.content - Contenido del mensaje
   * @param {string} messageData.type - Tipo (text, image, voice, multimodal)
   * @param {Array} messageData.attachments - Archivos adjuntos opcionales
   * @param {number} messageData.tokens - Tokens usados
   * @returns {Promise<Object>} - Mensaje creado
   */
  async createMessage(messageData) {
    try {
      const {
        conversationId,
        role,
        content,
        type = 'text',
        attachments = [],
        tokens = 0
      } = messageData;

      if (!conversationId || !role || !content) {
        throw new Error('conversationId, role y content son requeridos');
      }

      if (!['user', 'assistant'].includes(role)) {
        throw new Error('role debe ser user o assistant');
      }

      if (!['text', 'image', 'voice', 'multimodal', 'pdf'].includes(type)) {
        throw new Error('type invalido');
      }

      const message = await Message.create({
        conversationId,
        role,
        content,
        type,
        attachments,
        tokens
      });

      return message;
    } catch (error) {
      throw new Error(`Error creando mensaje: ${error.message}`);
    }
  }

  /**
   * Obtiene un mensaje por ID
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<Object|null>} - Mensaje encontrado
   */
  async getMessageById(messageId) {
    try {
      if (!messageId) {
        throw new Error('messageId es requerido');
      }

      const message = await Message.findById(messageId);
      return message;
    } catch (error) {
      throw new Error(`Error obteniendo mensaje: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los mensajes de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @param {Object} options - Opciones de paginacion
   * @returns {Promise<Object>} - Mensajes paginados
   */
  async getConversationMessages(conversationId, options = {}) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 50;
      const skip = (page - 1) * limit;

      const messages = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Message.countDocuments({ conversationId });

      return {
        messages,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error obteniendo mensajes: ${error.message}`);
    }
  }

  /**
   * Actualiza un mensaje
   * @param {string} messageId - ID del mensaje
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} - Mensaje actualizado
   */
  async updateMessage(messageId, updates) {
    try {
      if (!messageId) {
        throw new Error('messageId es requerido');
      }

      const allowedUpdates = ['content', 'attachments'];
      const updateKeys = Object.keys(updates);
      const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

      if (!isValidUpdate) {
        throw new Error('Actualizaciones no permitidas');
      }

      const message = await Message.findByIdAndUpdate(
        messageId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!message) {
        throw new Error('Mensaje no encontrado');
      }

      return message;
    } catch (error) {
      throw new Error(`Error actualizando mensaje: ${error.message}`);
    }
  }

  /**
   * Elimina un mensaje
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<boolean>} - true si se elimino exitosamente
   */
  async deleteMessage(messageId) {
    try {
      if (!messageId) {
        throw new Error('messageId es requerido');
      }

      const result = await Message.findByIdAndDelete(messageId);
      return !!result;
    } catch (error) {
      throw new Error(`Error eliminando mensaje: ${error.message}`);
    }
  }

  /**
   * Elimina todos los mensajes de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @returns {Promise<number>} - Numero de mensajes eliminados
   */
  async deleteConversationMessages(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const result = await Message.deleteMany({ conversationId });
      return result.deletedCount;
    } catch (error) {
      throw new Error(`Error eliminando mensajes: ${error.message}`);
    }
  }

  /**
   * Cuenta los mensajes de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @returns {Promise<number>} - Total de mensajes
   */
  async countConversationMessages(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const count = await Message.countDocuments({ conversationId });
      return count;
    } catch (error) {
      throw new Error(`Error contando mensajes: ${error.message}`);
    }
  }

  /**
   * Obtiene el ultimo mensaje de una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @returns {Promise<Object|null>} - Ultimo mensaje
   */
  async getLastMessage(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const message = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 });

      return message;
    } catch (error) {
      throw new Error(`Error obteniendo ultimo mensaje: ${error.message}`);
    }
  }

  /**
   * Obtiene mensajes por tipo
   * @param {string} conversationId - ID de la conversacion
   * @param {string} type - Tipo de mensaje
   * @returns {Promise<Array>} - Mensajes del tipo especificado
   */
  async getMessagesByType(conversationId, type) {
    try {
      if (!conversationId || !type) {
        throw new Error('conversationId y type son requeridos');
      }

      const messages = await Message.find({
        conversationId,
        type
      }).sort({ createdAt: 1 });

      return messages;
    } catch (error) {
      throw new Error(`Error obteniendo mensajes por tipo: ${error.message}`);
    }
  }

  /**
   * Obtiene mensajes por rol
   * @param {string} conversationId - ID de la conversacion
   * @param {string} role - Rol (user o assistant)
   * @returns {Promise<Array>} - Mensajes del rol especificado
   */
  async getMessagesByRole(conversationId, role) {
    try {
      if (!conversationId || !role) {
        throw new Error('conversationId y role son requeridos');
      }

      if (!['user', 'assistant'].includes(role)) {
        throw new Error('role debe ser user o assistant');
      }

      const messages = await Message.find({
        conversationId,
        role
      }).sort({ createdAt: 1 });

      return messages;
    } catch (error) {
      throw new Error(`Error obteniendo mensajes por rol: ${error.message}`);
    }
  }

  /**
   * Busca mensajes por contenido
   * @param {string} conversationId - ID de la conversacion
   * @param {string} searchTerm - Termino de busqueda
   * @returns {Promise<Array>} - Mensajes encontrados
   */
  async searchMessages(conversationId, searchTerm) {
    try {
      if (!conversationId || !searchTerm) {
        throw new Error('conversationId y searchTerm son requeridos');
      }

      const messages = await Message.find({
        conversationId,
        content: { $regex: searchTerm, $options: 'i' }
      }).sort({ createdAt: 1 });

      return messages;
    } catch (error) {
      throw new Error(`Error buscando mensajes: ${error.message}`);
    }
  }

  /**
   * Calcula el total de tokens usados en una conversacion
   * @param {string} conversationId - ID de la conversacion
   * @returns {Promise<number>} - Total de tokens
   */
  async getTotalTokens(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const messages = await Message.find({ conversationId });
      const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

      return totalTokens;
    } catch (error) {
      throw new Error(`Error calculando tokens: ${error.message}`);
    }
  }

  /**
   * Obtiene mensajes con adjuntos
   * @param {string} conversationId - ID de la conversacion
   * @returns {Promise<Array>} - Mensajes con adjuntos
   */
  async getMessagesWithAttachments(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('conversationId es requerido');
      }

      const messages = await Message.find({
        conversationId,
        attachments: { $exists: true, $ne: [] }
      }).sort({ createdAt: 1 });

      return messages;
    } catch (error) {
      throw new Error(`Error obteniendo mensajes con adjuntos: ${error.message}`);
    }
  }
}

module.exports = new MessageService();