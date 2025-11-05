// src/controllers/auth/profile.controller.js

const userService = require('../../services/database/user.service');
const passwordService = require('../../services/auth/password.service');
const { validationResult } = require('express-validator');

/**
 * Obtener perfil del usuario autenticado
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          numeroControl: user.numeroControl,
          email: user.email,
          nombreCompleto: user.nombreCompleto,
          carrera: user.carrera,
          semestre: user.semestre,
          avatar: user.avatar,
          telefono: user.telefono || null,
          role: user.role,
          preferences: user.preferences,
          isActive: user.isActive,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar perfil del usuario
 */
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('ERRORES DE VALIDACION DETECTADOS:');
      errors.array().forEach((err, idx) => {
        console.log(`  ${idx + 1}. Campo: ${err.path || err.param}`);
        console.log(`     Mensaje: ${err.msg}`);
        console.log(`     Valor: ${typeof err.value === 'string' && err.value.length > 100 ? err.value.substring(0, 100) + '...' : err.value}`);
      });
      
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { nombreCompleto, carrera, semestre, avatar, telefono } = req.body;

    // Verificar que no se intenten cambiar campos inmutables
    if (req.body.numeroControl !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'El numero de control no se puede modificar'
      });
    }

    if (req.body.email !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'El email no se puede modificar'
      });
    }

    const updateData = {};

    // Actualizar nombre completo
    if (nombreCompleto !== undefined) {
      if (nombreCompleto.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 3 caracteres'
        });
      }
      updateData.nombreCompleto = nombreCompleto.trim();
    }

    // Actualizar carrera
    if (carrera !== undefined) {
      updateData.carrera = carrera;
    }

    // Actualizar semestre
    if (semestre !== undefined) {
      if (semestre < 1 || semestre > 12) {
        return res.status(400).json({
          success: false,
          message: 'El semestre debe estar entre 1 y 12'
        });
      }
      updateData.semestre = semestre;
    }

    // Actualizar avatar
    if (avatar !== undefined) {
      if (avatar === '' || avatar === null) {
        updateData.avatar = null;
      } else if (typeof avatar === 'string' && avatar.startsWith('data:image/')) {
        updateData.avatar = avatar;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Formato de avatar invalido'
        });
      }
    }

    // Actualizar telefono
    if (telefono !== undefined) {
      if (telefono === '' || telefono === null) {
        updateData.telefono = null;
      } else if (!/^[0-9]{10}$/.test(telefono)) {
        return res.status(400).json({
          success: false,
          message: 'El telefono debe tener 10 digitos'
        });
      } else {
        updateData.telefono = telefono;
      }
    }

    // Actualizar usuario
    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: {
          id: updatedUser._id,
          numeroControl: updatedUser.numeroControl,
          email: updatedUser.email,
          nombreCompleto: updatedUser.nombreCompleto,
          carrera: updatedUser.carrera,
          semestre: updatedUser.semestre,
          avatar: updatedUser.avatar,
          telefono: updatedUser.telefono || null,
          role: updatedUser.role,
          updatedAt: updatedUser.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar contrasena del usuario
 */
const changePassword = async (req, res, next) => {
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
    const { currentPassword, newPassword } = req.body;

    const User = require('../../models/User.model');
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const isPasswordValid = await passwordService.comparePassword(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Contrasena actual incorrecta'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Contrasena actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar preferencias del usuario
 */
const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { theme, language, notifications } = req.body;

    // Validar que al menos se proporcione una preferencia
    if (!theme && !language && !notifications) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una preferencia para actualizar'
      });
    }

    const User = require('../../models/User.model');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar preferencias
    if (theme !== undefined) {
      const validThemes = ['light', 'dark', 'system'];
      if (!validThemes.includes(theme)) {
        return res.status(400).json({
          success: false,
          message: 'Tema invalido. Valores permitidos: light, dark, system'
        });
      }
      user.preferences.theme = theme;
    }

    if (language !== undefined) {
      const validLanguages = ['es', 'en'];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({
          success: false,
          message: 'Idioma invalido. Valores permitidos: es, en'
        });
      }
      user.preferences.language = language;
    }

    if (notifications !== undefined) {
      if (typeof notifications !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Las notificaciones deben ser un objeto'
        });
      }

      // Actualizar notificaciones solo si se proporcionan
      if (notifications.email !== undefined) {
        user.preferences.notifications.email = Boolean(notifications.email);
      }
      if (notifications.push !== undefined) {
        user.preferences.notifications.push = Boolean(notifications.push);
      }
      if (notifications.updates !== undefined) {
        user.preferences.notifications.updates = Boolean(notifications.updates);
      }
      if (notifications.tips !== undefined) {
        user.preferences.notifications.tips = Boolean(notifications.tips);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferencias actualizadas exitosamente',
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadisticas del usuario
 */
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await userService.getUserStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener usuario por numero de control (solo para admins)
 */
const getUserByNumeroControl = async (req, res, next) => {
  try {
    const { numeroControl } = req.params;

    const user = await userService.getUserByNumeroControl(numeroControl);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Listar usuarios por carrera (solo para admins/profesores)
 */
const getUsersByCarrera = async (req, res, next) => {
  try {
    const { carrera } = req.params;
    const { semestre } = req.query;

    const User = require('../../models/User.model');
    const users = await User.findByCarrera(carrera, semestre ? parseInt(semestre) : null);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => user.toPublicJSON()),
        total: users.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  getUserStats,
  getUserByNumeroControl,
  getUsersByCarrera
};