// src/controllers/auth/profile.controller.js

const userService = require('../../services/database/user.service');
const passwordService = require('../../services/auth/password.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await userService.findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.password = undefined;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
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

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: newusername
 *               avatar:
 *                 type: string
 *                 example: https://example.com/avatar.jpg
 *               preferences:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     example: dark
 *                   language:
 *                     type: string
 *                     example: es
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *       400:
 *         description: Datos invalidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
const updateProfile = async (req, res, next) => {
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
    const { username, avatar, preferences } = req.body;

    const updateData = {};

    if (username) {
      const existingUsername = await userService.findUserByUsername(username);
      if (existingUsername && existingUsername._id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya esta en uso'
        });
      }
      updateData.username = username;
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    if (preferences) {
      updateData.preferences = preferences;
    }

    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    updatedUser.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
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

/**
 * @swagger
 * /api/user/password:
 *   put:
 *     summary: Cambiar contrasena del usuario
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Contrasena actualizada exitosamente
 *       400:
 *         description: Contrasena actual incorrecta
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
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

    const user = await userService.findUserById(userId);

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

    const hashedPassword = await passwordService.hashPassword(newPassword);

    await userService.updateUser(userId, { password: hashedPassword });

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