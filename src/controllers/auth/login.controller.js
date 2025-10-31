// src/controllers/auth/login.controller.js

const passwordService = require('../../services/auth/password.service');
const tokenService = require('../../services/auth/token.service');
const userService = require('../../services/database/user.service');
const sessionService = require('../../services/auth/session.service');
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


    const User = require('../../models/User.model');
    const user = await User.findOne({ email }).select('+password');
    
    // LOGS DE DIAGNOSTICO - TEMPORAL
console.log('Usuario encontrado:', !!user);
console.log('Email buscado:', email);
console.log('Usuario en DB:', user ? user.email : 'No encontrado');
console.log('Password en DB existe:', user ? !!user.password : 'N/A');
console.log('Password recibido:', password);


    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales invalidas'
      });
    }

    const isPasswordValid = await passwordService.comparePassword(
      password,
      user.password
    );

    console.log('Password válido:', isPasswordValid);
console.log('Tipo de password recibido:', typeof password);
console.log('Tipo de hash en BD:', typeof user.password);


    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales invalidas'
      });
    }

    const token = tokenService.generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    await sessionService.createSession({
      userId: user._id,
      token,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('token', token, cookieOptions);

    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          preferences: user.preferences
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login
};