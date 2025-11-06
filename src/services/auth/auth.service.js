// src/services/auth/auth.service.js

const User = require('../../models/User.model');
const passwordService = require('./password.service');
const tokenService = require('./token.service');
const sessionService = require('./session.service');

class AuthService {
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

  async login(credentials, ipAddress, userAgent) {
    const { email, password } = credentials;

    console.log('DEBUG 1 - Iniciando login para:', email);
    console.log('DEBUG 1.5 - Password recibido length:', password?.length);

    if (!email || !password) {
      throw new Error('Email y password son requeridos');
    }

    const user = await User.findOne({ email }).select('+password');

    console.log('DEBUG 2 - Usuario encontrado:', user ? 'SI' : 'NO');
    
    if (!user) {
      console.log('DEBUG 3 - Usuario NO existe en la BD');
      throw new Error('Credenciales invalidas');
    }

    console.log('DEBUG 4 - Datos del usuario:', {
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      isVerified: user.isVerified,
      isActive: user.isActive
    });

    console.log('DEBUG 5 - Verificando password...');

    const isPasswordValid = await passwordService.comparePassword(
      password,
      user.password
    );

    console.log('DEBUG 6 - Password valido:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('DEBUG 7 - Password INCORRECTO');
      throw new Error('Credenciales invalidas');
    }

    console.log('DEBUG 8 - Usuario encontrado y password correcto:', {
      email: user.email,
      isVerified: user.isVerified,
      isActive: user.isActive
    });

    if (!user.isVerified) {
      console.log('DEBUG 9 - Cuenta NO verificada, lanzando error con code');
      const error = new Error('Por favor verifica tu correo electronico antes de iniciar sesion. Revisa tu bandeja de entrada.');
      error.code = 'ACCOUNT_NOT_VERIFIED';
      error.email = email;
      console.log('DEBUG 10 - Error creado:', { message: error.message, code: error.code });
      throw error;
    }

    if (!user.isActive) {
      console.log('DEBUG 11 - Cuenta NO activa, lanzando error con code');
      const error = new Error('Tu cuenta ha sido desactivada. Contacta a servicios escolares.');
      error.code = 'ACCOUNT_DISABLED';
      throw error;
    }

    console.log('DEBUG 12 - Todo OK, generando token...');

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

    await user.updateLastLogin();

    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token
    };
  }

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