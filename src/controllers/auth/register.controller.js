// src/controllers/auth/register.controller.js

const User = require('../../models/User.model');
const emailService = require('../../services/email/email.service');
const { validationResult } = require('express-validator');
const { CARRERAS } = require('../../config/constants');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Errores de validacion:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
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

    console.log('Datos recibidos:', {
      numeroControl,
      nombreCompleto,
      carrera,
      semestre,
      tieneTelefono: !!telefono,
      tieneAvatar: !!avatar
    });

    if (!numeroControl || !/^\d{8}$/.test(numeroControl.toString())) {
      return res.status(400).json({
        success: false,
        message: 'El numero de control debe tener 8 digitos'
      });
    }

    const carrerasValidas = Object.values(CARRERAS);
    if (!carrerasValidas.includes(carrera)) {
      return res.status(400).json({
        success: false,
        message: 'Carrera no valida',
        carrerasDisponibles: carrerasValidas
      });
    }

    const semestreNum = parseInt(semestre);
    if (isNaN(semestreNum) || semestreNum < 1 || semestreNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'El semestre debe estar entre 1 y 12'
      });
    }

    const existingNumeroControl = await User.findByNumeroControl(numeroControl);
    if (existingNumeroControl) {
      return res.status(400).json({
        success: false,
        message: 'El numero de control ya esta registrado'
      });
    }

    const email = `al${numeroControl}@ite.edu.mx`;

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'El email ya esta registrado'
      });
    }

    if (telefono && !/^[0-9]{10}$/.test(telefono)) {
      return res.status(400).json({
        success: false,
        message: 'El telefono debe tener 10 digitos'
      });
    }

    if (avatar && !avatar.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Formato de avatar invalido. Debe ser una imagen en base64'
      });
    }

    const userData = {
      numeroControl: numeroControl.toString(),
      password,
      nombreCompleto: nombreCompleto.trim(),
      carrera,
      semestre: semestreNum,
      isVerified: false,
    };

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

    const newUser = await User.create(userData);

    console.log('Usuario creado exitosamente:', newUser._id);

    const verificationToken = newUser.generateEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    console.log('Token de verificacion generado');

    const emailResult = await emailService.sendVerificationEmail(
      newUser.email,
      verificationToken,
      newUser.nombreCompleto
    );

    if (!emailResult.success) {
      console.error('Error enviando email de verificacion:', emailResult.error);
    } else {
      console.log('Email de verificacion enviado exitosamente');
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente. Por favor verifica tu correo electronico para activar tu cuenta.',
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
        requiresVerification: true
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validacion',
        errors: messages
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `El ${field} ya esta registrado`
      });
    }

    next(error);
  }
};

module.exports = {
  register
};