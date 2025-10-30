// src/controllers/auth/login.controller.js

const passwordService = require('../../services/auth/password.service');
const tokenService = require('../../services/auth/token.service');
const userService = require('../../services/database/user.service');
const sessionService = require('../../services/auth/session.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesion
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login exitoso
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                     token:
 *                       type: string
 *       401:
 *         description: Credenciales invalidas
 *       500:
 *         description: Error del servidor
 */
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

    const user = await userService.findUserByEmail(email);
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