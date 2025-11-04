// src/controllers/auth/register.controller.js

const User = require('../../models/User.model');
const tokenService = require('../../services/auth/token.service');
const { validationResult } = require('express-validator');
const { CARRERAS } = require('../../config/constants');

const register = async (req, res, next) => {
  try {
    // Verificar errores de express-validator primero
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Errores de validación:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { 
      numeroControl, 
      password, 
      nombreCompleto, 
      carrera, 
      semestre,
      telefono,
      avatar 
    } = req.body;

    // Log para debugging
    console.log('Datos recibidos:', {
      numeroControl,
      nombreCompleto,
      carrera,
      semestre,
      tieneTelefono: !!telefono,
      tieneAvatar: !!avatar
    });

    // Validación de número de control
    if (!numeroControl || !/^\d{8}$/.test(numeroControl.toString())) {
      return res.status(400).json({
        success: false,
        message: 'El número de control debe tener 8 dígitos'
      });
    }

    // Validación de carrera
    const carrerasValidas = Object.values(CARRERAS);
    if (!carrerasValidas.includes(carrera)) {
      return res.status(400).json({
        success: false,
        message: 'Carrera no válida',
        carrerasDisponibles: carrerasValidas
      });
    }

    // Validación de semestre
    const semestreNum = parseInt(semestre);
    if (isNaN(semestreNum) || semestreNum < 1 || semestreNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'El semestre debe estar entre 1 y 12'
      });
    }

    // Verificar si el número de control ya existe
    const existingNumeroControl = await User.findByNumeroControl(numeroControl);
    if (existingNumeroControl) {
      return res.status(400).json({
        success: false,
        message: 'El número de control ya está registrado'
      });
    }

    // Generar email automáticamente
    const email = `al${numeroControl}@ite.edu.mx`;

    // Verificar si el email ya existe (por si acaso)
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Validación de teléfono (opcional)
    if (telefono && !/^[0-9]{10}$/.test(telefono)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono debe tener 10 dígitos'
      });
    }

    // Validación de avatar (opcional)
    if (avatar && !avatar.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Formato de avatar inválido. Debe ser una imagen en base64'
      });
    }

    // Preparar datos del usuario
    const userData = {
      numeroControl: numeroControl.toString(),
      password,
      nombreCompleto: nombreCompleto.trim(),
      carrera,
      semestre: semestreNum,
    };

    // Agregar campos opcionales solo si están presentes
    if (telefono) {
      userData.telefono = telefono;
    }

    if (avatar) {
      userData.avatar = avatar;
    }

    console.log('Intentando crear usuario con:', {
      numeroControl: userData.numeroControl,
      nombreCompleto: userData.nombreCompleto,
      carrera: userData.carrera,
      semestre: userData.semestre
    });

    // Crear usuario
    const newUser = await User.create(userData);

    console.log('Usuario creado exitosamente:', newUser._id);

    // Generar token
    const token = tokenService.generateToken({
      id: newUser._id,
      numeroControl: newUser.numeroControl,
      email: newUser.email,
      role: newUser.role
    });

    // Configurar cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('token', token, cookieOptions);

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: newUser._id,
          numeroControl: newUser.numeroControl,
          email: newUser.email,
          nombreCompleto: newUser.nombreCompleto,
          carrera: newUser.carrera,
          semestre: newUser.semestre,
          avatar: newUser.avatar || null,
          telefono: newUser.telefono || null,
          role: newUser.role,
          isActive: newUser.isActive,
          isVerified: newUser.isVerified,
          createdAt: newUser.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);

    // Error de validación de Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    // Error de duplicado (índice único)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `El ${field} ya está registrado`
      });
    }

    // Otros errores
    next(error);
  }
};

module.exports = {
  register
};