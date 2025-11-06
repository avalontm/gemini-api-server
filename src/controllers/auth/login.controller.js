// src/controllers/auth/login.controller.js

const authService = require('../../services/auth/auth.service');
const { validationResult } = require('express-validator');

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    console.log('Email recibido:', email);
    console.log('Password recibido:', password ? '***' : 'vacio');

    const result = await authService.login(
      { email, password },
      req.ip,
      req.get('user-agent')
    );

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('token', result.token, cookieOptions);

    const userResponse = {
      id: result.user._id,
      numeroControl: result.user.numeroControl,
      email: result.user.email,
      nombreCompleto: result.user.nombreCompleto,
      carrera: result.user.carrera,
      semestre: result.user.semestre,
      telefono: result.user.telefono,
      avatar: result.user.avatar,
      role: result.user.role,
      preferences: result.user.preferences || {
        theme: 'system',
        language: 'es',
        notifications: {
          email: true,
          push: false,
          updates: true,
          tips: true,
        }
      },
      isActive: result.user.isActive,
      isVerified: result.user.isVerified,
      lastLogin: result.user.lastLogin,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userResponse,
        token: result.token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    
    if (error.code === 'ACCOUNT_NOT_VERIFIED') {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: 'ACCOUNT_NOT_VERIFIED',
        data: {
          email: error.email,
          needsVerification: true
        }
      });
    }

    if (error.code === 'ACCOUNT_DISABLED') {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: 'ACCOUNT_DISABLED',
        data: {
          needsSupport: true
        }
      });
    }
    
    if (error.message.includes('Credenciales invalidas')) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales invalidas',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    if (error.message.includes('Error en login')) {
      return res.status(400).json({
        success: false,
        message: error.message.replace('Error en login: ', ''),
        code: 'LOGIN_ERROR'
      });
    }
    
    next(error);
  }
};

module.exports = {
  login
};