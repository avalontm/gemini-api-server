// src/controllers/auth/verify-email.controller.js

const crypto = require('crypto');
const User = require('../../models/User.model');
const emailService = require('../../services/email/email.service');

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de verificacion es requerido'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalido o expirado. Por favor registrate nuevamente.'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Esta cuenta ya ha sido verificada'
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpire = null;
    await user.save({ validateBeforeSave: false });

    console.log('Usuario verificado exitosamente:', user.email);

    await emailService.sendWelcomeEmail(user.email, user.nombreCompleto);

    res.status(200).json({
      success: true,
      message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesion.',
      data: {
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Error en verificacion de email:', error);
    next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Si el correo existe y no esta verificado, recibiras un email de verificacion'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Esta cuenta ya esta verificada'
      });
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const emailResult = await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.nombreCompleto
    );

    if (!emailResult.success) {
      console.error('Error enviando email de verificacion:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar el correo de verificacion'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Correo de verificacion enviado exitosamente'
    });
  } catch (error) {
    console.error('Error reenviando email de verificacion:', error);
    next(error);
  }
};

module.exports = {
  verifyEmail,
  resendVerificationEmail
};