// src/services/auth/auth.service.js

const User = require('../../models/User.model');
const passwordService = require('./password.service');
const tokenService = require('./token.service');
const sessionService = require('./session.service');

class AuthService {
  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.username - Nombre de usuario
   * @param {string} userData.email - Email del usuario
   * @param {string} userData.password - Contrasena en texto plano
   * @returns {Promise<Object>} - Usuario creado y token
   */
  async register(userData) {
    try {
      const { username, email, password } = userData;

      if (!username || !email || !password) {
        throw new Error('Username, email y password son requeridos');
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new Error('El email ya esta registrado');
        }
        if (existingUser.username === username) {
          throw new Error('El username ya esta en uso');
        }
      }

      const passwordValidation = passwordService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const hashedPassword = await passwordService.hashPassword(password);

      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: 'user',
        preferences: {
          theme: 'auto',
          language: 'es',
          notifications: true
        }
      });

      const token = tokenService.generateToken({
        id: user._id,
        email: user.email,
        role: user.role
      });

      const userResponse = user.toObject();
      delete userResponse.password;

      return {
        user: userResponse,
        token
      };
    } catch (error) {
      throw new Error(`Error en registro: ${error.message}`);
    }
  }

  /**
   * Autentica un usuario
   * @param {Object} credentials - Credenciales
   * @param {string} credentials.email - Email del usuario
   * @param {string} credentials.password - Contrasena en texto plano
   * @param {string} ipAddress - Direccion IP del cliente
   * @param {string} userAgent - User agent del navegador
   * @returns {Promise<Object>} - Usuario y token
   */
  async login(credentials, ipAddress, userAgent) {
    try {
      const { email, password } = credentials;

      if (!email || !password) {
        throw new Error('Email y password son requeridos');
      }

      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        throw new Error('Credenciales invalidas');
      }

      const isPasswordValid = await passwordService.comparePassword(
        password,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error('Credenciales invalidas');
      }

      const token = tokenService.generateToken({
        id: user._id,
        email: user.email,
        role: user.role
      });

      await sessionService.createSession({
        userId: user._id,
        token,
        ipAddress,
        userAgent
      });

      const userResponse = user.toObject();
      delete userResponse.password;

      return {
        user: userResponse,
        token
      };
    } catch (error) {
      throw new Error(`Error en login: ${error.message}`);
    }
  }

  /**
   * Cierra la sesion de un usuario
   * @param {string} token - Token JWT
   * @returns {Promise<boolean>} - true si se cerro exitosamente
   */
  async logout(token) {
    try {
      if (!token) {
        throw new Error('Token es requerido');
      }

      await sessionService.deleteSession(token);
      tokenService.invalidateToken(token);

      return true;
    } catch (error) {
      throw new Error(`Error en logout: ${error.message}`);
    }
  }

  /**
   * Verifica un token y devuelve el usuario
   * @param {string} token - Token JWT
   * @returns {Promise<Object>} - Usuario autenticado
   */
  async verifyAuth(token) {
    try {
      if (!token) {
        throw new Error('Token es requerido');
      }

      const decoded = tokenService.verifyToken(token);

      const isSessionActive = await sessionService.isSessionActive(token);
      if (!isSessionActive) {
        throw new Error('Sesion no valida o expirada');
      }

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return user;
    } catch (error) {
      throw new Error(`Error verificando autenticacion: ${error.message}`);
    }
  }

  /**
   * Cambia la contrasena de un usuario
   * @param {string} userId - ID del usuario
   * @param {string} currentPassword - Contrasena actual
   * @param {string} newPassword - Nueva contrasena
   * @returns {Promise<boolean>} - true si se cambio exitosamente
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      if (!userId || !currentPassword || !newPassword) {
        throw new Error('Todos los campos son requeridos');
      }

      const user = await User.findById(userId).select('+password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const isPasswordValid = await passwordService.comparePassword(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error('Contrasena actual incorrecta');
      }

      if (currentPassword === newPassword) {
        throw new Error('La nueva contrasena debe ser diferente a la actual');
      }

      const passwordValidation = passwordService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const hashedPassword = await passwordService.hashPassword(newPassword);

      user.password = hashedPassword;
      await user.save();

      await sessionService.deleteAllUserSessions(userId);

      return true;
    } catch (error) {
      throw new Error(`Error cambiando contrasena: ${error.message}`);
    }
  }

  /**
   * Refresca un token expirado usando refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} - Nuevo token
   */
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token es requerido');
      }

      if (!tokenService.isRefreshToken(refreshToken)) {
        throw new Error('Token invalido');
      }

      const decoded = tokenService.verifyToken(refreshToken);

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const newToken = tokenService.generateToken({
        id: user._id,
        email: user.email,
        role: user.role
      });

      return {
        token: newToken
      };
    } catch (error) {
      throw new Error(`Error refrescando token: ${error.message}`);
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Perfil del usuario
   */
  async getProfile(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const user = await User.findById(userId).select('-password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return user;
    } catch (error) {
      throw new Error(`Error obteniendo perfil: ${error.message}`);
    }
  }

  /**
   * Actualiza el perfil del usuario
   * @param {string} userId - ID del usuario
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} - Usuario actualizado
   */
  async updateProfile(userId, updates) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const allowedUpdates = ['username', 'email', 'avatar'];
      const updateKeys = Object.keys(updates);
      const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

      if (!isValidUpdate) {
        throw new Error('Actualizaciones no permitidas');
      }

      if (updates.email || updates.username) {
        const existingUser = await User.findOne({
          _id: { $ne: userId },
          $or: [
            { email: updates.email },
            { username: updates.username }
          ]
        });

        if (existingUser) {
          if (existingUser.email === updates.email) {
            throw new Error('El email ya esta en uso');
          }
          if (existingUser.username === updates.username) {
            throw new Error('El username ya esta en uso');
          }
        }
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
      throw new Error(`Error actualizando perfil: ${error.message}`);
    }
  }
}

module.exports = new AuthService();