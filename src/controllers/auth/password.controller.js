// src/controllers/auth/password.controller.js

const crypto = require('crypto');
const User = require('../../models/User.model');
const emailService = require('../../services/email/email.service');
const { validationResult } = require('express-validator');

const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Si el correo existe, recibiras instrucciones para restablecer tu contrasena',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.nombreCompleto
      );

      res.status(200).json({
        success: true,
        message: 'Si el correo existe, recibiras instrucciones para restablecer tu contrasena',
      });
    } catch (error) {
      console.error('[FORGOT-PASSWORD] Error enviando email:', error);

      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Error al enviar el correo. Intenta de nuevo mas tarde.',
      });
    }
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Error:', error);
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array(),
      });
    }

    const { token } = req.body;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contrasena son requeridos',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalido o expirado',
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    try {
      await emailService.sendPasswordChangedEmail(
        user.email,
        user.nombreCompleto
      );
    } catch (error) {
      console.error('[RESET-PASSWORD] Error enviando email de confirmacion:', error);
    }

    res.status(200).json({
      success: true,
      message: 'Contrasena restablecida exitosamente',
    });
  } catch (error) {
    console.error('[RESET-PASSWORD] Error:', error);
    next(error);
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
};