// src/controllers/auth/profile.controller.js

const userService = require('../../services/database/user.service');
const passwordService = require('../../services/auth/password.service');
const { validationResult } = require('express-validator');

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
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio || '',
          role: user.role,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    // Verificar errores de validacion
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
    const { username, avatar, bio, preferences } = req.body;

    // Verificar que no se intente cambiar el email
    if (req.body.email !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'El email no se puede modificar'
      });
    }

    const updateData = {};

    // Validar y actualizar username si se proporciona
    if (username !== undefined) {
      const existingUsername = await userService.getUserByUsername(username);
      if (existingUsername && existingUsername._id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya esta en uso'
        });
      }
      updateData.username = username;
    }

    // Actualizar avatar si se proporciona
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

    // Actualizar bio si se proporciona
    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'La biografia no puede exceder 500 caracteres'
        });
      }
      updateData.bio = bio;
    }

    // Actualizar preferencias si se proporcionan
    if (preferences !== undefined) {
      updateData.preferences = preferences;
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
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio || '',
          role: updatedUser.role,
          preferences: updatedUser.preferences,
          updatedAt: updatedUser.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
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

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};