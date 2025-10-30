// src/services/database/user.service.js

const User = require('../../models/User.model');
const Conversation = require('../../models/Conversation.model');
const Message = require('../../models/Message.model');

class UserService {
  /**
   * Crea un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} - Usuario creado
   */
  async createUser(userData) {
    try {
      const user = await User.create(userData);
      const userObject = user.toObject();
      delete userObject.password;
      return userObject;
    } catch (error) {
      throw new Error(`Error creando usuario: ${error.message}`);
    }
  }

  /**
   * Obtiene un usuario por ID
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} - Usuario encontrado
   */
  async getUserById(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const user = await User.findById(userId).select('-password');
      return user;
    } catch (error) {
      throw new Error(`Error obteniendo usuario: ${error.message}`);
    }
  }

  /**
   * Obtiene un usuario por email
   * @param {string} email - Email del usuario
   * @returns {Promise<Object|null>} - Usuario encontrado
   */
  async getUserByEmail(email) {
    try {
      if (!email) {
        throw new Error('email es requerido');
      }

      const user = await User.findOne({ email }).select('-password');
      return user;
    } catch (error) {
      throw new Error(`Error obteniendo usuario por email: ${error.message}`);
    }
  }

  /**
   * Obtiene un usuario por username
   * @param {string} username - Username del usuario
   * @returns {Promise<Object|null>} - Usuario encontrado
   */
  async getUserByUsername(username) {
    try {
      if (!username) {
        throw new Error('username es requerido');
      }

      const user = await User.findOne({ username }).select('-password');
      return user;
    } catch (error) {
      throw new Error(`Error obteniendo usuario por username: ${error.message}`);
    }
  }

  /**
   * Actualiza un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} - Usuario actualizado
   */
  async updateUser(userId, updates) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return user;
    } catch (error) {
      throw new Error(`Error actualizando usuario: ${error.message}`);
    }
  }

  /**
   * Elimina un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} - true si se elimino exitosamente
   */
  async deleteUser(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      await Conversation.deleteMany({ userId });
      await Message.deleteMany({ userId });

      const result = await User.findByIdAndDelete(userId);

      return !!result;
    } catch (error) {
      throw new Error(`Error eliminando usuario: ${error.message}`);
    }
  }

  /**
   * Actualiza las preferencias del usuario
   * @param {string} userId - ID del usuario
   * @param {Object} preferences - Nuevas preferencias
   * @returns {Promise<Object>} - Usuario actualizado
   */
  async updateUserPreferences(userId, preferences) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { preferences } },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return user;
    } catch (error) {
      throw new Error(`Error actualizando preferencias: ${error.message}`);
    }
  }

  /**
   * Obtiene estadisticas de uso del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Estadisticas del usuario
   */
  async getUserStats(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const totalConversations = await Conversation.countDocuments({ userId });
      const totalMessages = await Message.countDocuments({ 
        conversationId: { $in: await Conversation.find({ userId }).distinct('_id') }
      });

      const conversations = await Conversation.find({ userId });
      const totalTokens = conversations.reduce((sum, conv) => {
        return sum + (conv.tokenUsage?.total || 0);
      }, 0);

      const estimatedCost = totalTokens * 0.00005;

      const lastConversation = await Conversation.findOne({ userId })
        .sort({ updatedAt: -1 })
        .select('updatedAt');

      return {
        totalConversations,
        totalMessages,
        totalTokens,
        estimatedCost: parseFloat(estimatedCost.toFixed(2)),
        lastActivity: lastConversation?.updatedAt || null
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadisticas: ${error.message}`);
    }
  }

  /**
   * Lista todos los usuarios con paginacion
   * @param {Object} options - Opciones de paginacion
   * @param {number} options.page - Numero de pagina
   * @param {number} options.limit - Usuarios por pagina
   * @returns {Promise<Object>} - Usuarios paginados
   */
  async listUsers(options = {}) {
    try {
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments();

      return {
        users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error listando usuarios: ${error.message}`);
    }
  }

  /**
   * Busca usuarios por termino
   * @param {string} searchTerm - Termino de busqueda
   * @returns {Promise<Array>} - Usuarios encontrados
   */
  async searchUsers(searchTerm) {
    try {
      if (!searchTerm) {
        throw new Error('searchTerm es requerido');
      }

      const users = await User.find({
        $or: [
          { username: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ]
      }).select('-password').limit(20);

      return users;
    } catch (error) {
      throw new Error(`Error buscando usuarios: ${error.message}`);
    }
  }

  /**
   * Verifica si un email ya existe
   * @param {string} email - Email a verificar
   * @param {string} excludeUserId - ID de usuario a excluir (opcional)
   * @returns {Promise<boolean>} - true si existe
   */
  async emailExists(email, excludeUserId = null) {
    try {
      if (!email) {
        throw new Error('email es requerido');
      }

      const query = { email };
      if (excludeUserId) {
        query._id = { $ne: excludeUserId };
      }

      const user = await User.findOne(query);
      return !!user;
    } catch (error) {
      throw new Error(`Error verificando email: ${error.message}`);
    }
  }

  /**
   * Verifica si un username ya existe
   * @param {string} username - Username a verificar
   * @param {string} excludeUserId - ID de usuario a excluir (opcional)
   * @returns {Promise<boolean>} - true si existe
   */
  async usernameExists(username, excludeUserId = null) {
    try {
      if (!username) {
        throw new Error('username es requerido');
      }

      const query = { username };
      if (excludeUserId) {
        query._id = { $ne: excludeUserId };
      }

      const user = await User.findOne(query);
      return !!user;
    } catch (error) {
      throw new Error(`Error verificando username: ${error.message}`);
    }
  }

  /**
   * Cuenta el total de usuarios
   * @returns {Promise<number>} - Total de usuarios
   */
  async countUsers() {
    try {
      const count = await User.countDocuments();
      return count;
    } catch (error) {
      throw new Error(`Error contando usuarios: ${error.message}`);
    }
  }
}

module.exports = new UserService();