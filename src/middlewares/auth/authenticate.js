// src/middlewares/auth/authenticate.js

const jwt = require('jsonwebtoken');
const { unauthorizedResponse } = require('../../utils/helpers/responseFormatter');
const { errorMessages } = require('../../utils/helpers/errorMessages');
const User = require('../../models/User.model');

/**
 * Middleware para autenticar usuario mediante JWT
 * Verifica el token y adjunta el usuario al objeto request
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    let token = null;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Tambien verificar en cookies como alternativa
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Verificar si existe el token
    if (!token) {
      return unauthorizedResponse(
        res,
        errorMessages.auth.TOKEN_MISSING
      );
    }
    
    // Verificar y decodificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return unauthorizedResponse(
          res,
          errorMessages.auth.TOKEN_EXPIRED
        );
      }
      return unauthorizedResponse(
        res,
        errorMessages.auth.INVALID_TOKEN
      );
    }
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return unauthorizedResponse(
        res,
        errorMessages.auth.USER_NOT_FOUND
      );
    }
    
    // Adjuntar usuario al request
    req.user = user;
    req.userId = user._id;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Error en authenticate middleware:', error);
    return unauthorizedResponse(
      res,
      errorMessages.auth.UNAUTHORIZED
    );
  }
};

/**
 * Middleware opcional - no falla si no hay token
 * Util para rutas que pueden funcionar con o sin autenticacion
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    let token = null;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Tambien verificar en cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Si no hay token, continuar sin usuario
    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }
    
    // Intentar verificar el token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user) {
        req.user = user;
        req.userId = user._id;
        req.token = token;
      } else {
        req.user = null;
        req.userId = null;
      }
    } catch (error) {
      // Si hay error, simplemente no autenticar
      req.user = null;
      req.userId = null;
    }
    
    next();
  } catch (error) {
    console.error('Error en optionalAuthenticate middleware:', error);
    req.user = null;
    req.userId = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
};