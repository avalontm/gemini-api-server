// src/services/auth/session.service.js

const Session = require('../../models/Session.model');
const tokenService = require('./token.service');

class SessionService {
  /**
   * Crea una nueva sesion para un usuario
   * @param {Object} data - Datos de la sesion
   * @param {string} data.userId - ID del usuario
   * @param {string} data.token - Token JWT
   * @param {string} data.ipAddress - Direccion IP del cliente
   * @param {string} data.userAgent - User agent del navegador
   * @returns {Promise<Object>} - Sesion creada
   */
  async createSession(data) {
    try {
      const { userId, token, ipAddress, userAgent } = data;

      if (!userId || !token) {
        throw new Error('userId y token son requeridos');
      }

      const decoded = tokenService.decodeToken(token);
      const expiresAt = new Date(decoded.payload.exp * 1000);

      const session = await Session.create({
        userId,
        token,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        expiresAt,
        createdAt: new Date()
      });

      return session;
    } catch (error) {
      throw new Error(`Error creando sesion: ${error.message}`);
    }
  }

  /**
   * Obtiene una sesion por token
   * @param {string} token - Token JWT
   * @returns {Promise<Object|null>} - Sesion encontrada o null
   */
  async getSessionByToken(token) {
    try {
      if (!token) {
        throw new Error('Token es requerido');
      }

      const session = await Session.findOne({ token }).populate('userId', '-password');

      if (!session) {
        return null;
      }

      if (new Date() > session.expiresAt) {
        await this.deleteSession(token);
        return null;
      }

      return session;
    } catch (error) {
      throw new Error(`Error obteniendo sesion: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las sesiones activas de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de sesiones
   */
  async getUserSessions(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const sessions = await Session.find({
        userId,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      return sessions;
    } catch (error) {
      throw new Error(`Error obteniendo sesiones del usuario: ${error.message}`);
    }
  }

  /**
   * Actualiza la ultima actividad de una sesion
   * @param {string} token - Token JWT
   * @returns {Promise<Object>} - Sesion actualizada
   */
  async updateSessionActivity(token) {
    try {
      if (!token) {
        throw new Error('Token es requerido');
      }

      const session = await Session.findOneAndUpdate(
        { token },
        { lastActivity: new Date() },
        { new: true }
      );

      if (!session) {
        throw new Error('Sesion no encontrada');
      }

      return session;
    } catch (error) {
      throw new Error(`Error actualizando actividad de sesion: ${error.message}`);
    }
  }

  /**
   * Elimina una sesion por token (logout)
   * @param {string} token - Token JWT
   * @returns {Promise<boolean>} - true si se elimino exitosamente
   */
  async deleteSession(token) {
    try {
      if (!token) {
        throw new Error('Token es requerido');
      }

      const result = await Session.findOneAndDelete({ token });

      return !!result;
    } catch (error) {
      throw new Error(`Error eliminando sesion: ${error.message}`);
    }
  }

  /**
   * Elimina todas las sesiones de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} - Numero de sesiones eliminadas
   */
  async deleteAllUserSessions(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const result = await Session.deleteMany({ userId });

      return result.deletedCount;
    } catch (error) {
      throw new Error(`Error eliminando sesiones del usuario: ${error.message}`);
    }
  }

  /**
   * Elimina sesiones expiradas de la base de datos
   * @returns {Promise<number>} - Numero de sesiones eliminadas
   */
  async cleanExpiredSessions() {
    try {
      const result = await Session.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      return result.deletedCount;
    } catch (error) {
      throw new Error(`Error limpiando sesiones expiradas: ${error.message}`);
    }
  }

  /**
   * Verifica si un token tiene una sesion activa
   * @param {string} token - Token JWT
   * @returns {Promise<boolean>} - true si la sesion esta activa
   */
  async isSessionActive(token) {
    try {
      const session = await this.getSessionByToken(token);
      return !!session;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cuenta las sesiones activas de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} - Numero de sesiones activas
   */
  async countUserSessions(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const count = await Session.countDocuments({
        userId,
        expiresAt: { $gt: new Date() }
      });

      return count;
    } catch (error) {
      throw new Error(`Error contando sesiones: ${error.message}`);
    }
  }

  /**
   * Limita el numero de sesiones simultaneas por usuario
   * @param {string} userId - ID del usuario
   * @param {number} maxSessions - Numero maximo de sesiones permitidas
   * @returns {Promise<number>} - Numero de sesiones eliminadas
   */
  async limitUserSessions(userId, maxSessions = 5) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const sessions = await Session.find({
        userId,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: 1 });

      if (sessions.length <= maxSessions) {
        return 0;
      }

      const sessionsToDelete = sessions.slice(0, sessions.length - maxSessions);
      const tokensToDelete = sessionsToDelete.map(s => s.token);

      const result = await Session.deleteMany({
        token: { $in: tokensToDelete }
      });

      return result.deletedCount;
    } catch (error) {
      throw new Error(`Error limitando sesiones: ${error.message}`);
    }
  }

  /**
   * Obtiene informacion de la sesion actual
   * @param {string} token - Token JWT
   * @returns {Promise<Object>} - Informacion de la sesion
   */
  async getSessionInfo(token) {
    try {
      const session = await this.getSessionByToken(token);

      if (!session) {
        return null;
      }

      const remainingTime = tokenService.getTokenRemainingTime(token);

      return {
        id: session._id,
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
        remainingTimeSeconds: remainingTime,
        isActive: remainingTime > 0
      };
    } catch (error) {
      throw new Error(`Error obteniendo informacion de sesion: ${error.message}`);
    }
  }
}

module.exports = new SessionService();