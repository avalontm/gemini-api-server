// src/middlewares/auth/validateToken.js

const { validationErrorResponse } = require('../../utils/helpers/responseFormatter');
const { errorMessages } = require('../../utils/helpers/errorMessages');

/**
 * Middleware para validar formato del token JWT
 * Verifica que el token tenga el formato correcto antes de procesarlo
 */
const validateToken = (req, res, next) => {
  try {
    // Obtener token del header Authorization
    let token = null;
    
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      
      // Verificar que tenga el formato "Bearer <token>"
      if (!authHeader.startsWith('Bearer ')) {
        return validationErrorResponse(res, [
          {
            field: 'authorization',
            message: 'El formato del token debe ser: Bearer <token>',
          },
        ]);
      }
      
      token = authHeader.split(' ')[1];
    }
    
    // Tambien verificar en cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Si no hay token, continuar (authenticate se encargara de rechazar)
    if (!token) {
      return next();
    }
    
    // Validar formato basico del token JWT
    // Un JWT valido tiene 3 partes separadas por puntos: header.payload.signature
    const tokenParts = token.split('.');
    
    if (tokenParts.length !== 3) {
      return validationErrorResponse(res, [
        {
          field: 'token',
          message: 'Formato de token invalido',
        },
      ]);
    }
    
    // Verificar que cada parte sea base64url valida
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    
    for (let i = 0; i < tokenParts.length; i++) {
      if (!base64UrlPattern.test(tokenParts[i])) {
        return validationErrorResponse(res, [
          {
            field: 'token',
            message: 'Token contiene caracteres invalidos',
          },
        ]);
      }
    }
    
    // Validar longitud razonable del token
    if (token.length < 50 || token.length > 2000) {
      return validationErrorResponse(res, [
        {
          field: 'token',
          message: 'Longitud del token fuera de rango',
        },
      ]);
    }
    
    // Si todo es valido, continuar
    next();
  } catch (error) {
    console.error('Error en validateToken middleware:', error);
    return validationErrorResponse(res, [
      {
        field: 'token',
        message: 'Error al validar token',
      },
    ]);
  }
};

/**
 * Middleware para validar token en query params
 * Util para links de verificacion, reset password, etc.
 */
const validateQueryToken = (req, res, next) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return validationErrorResponse(res, [
        {
          field: 'token',
          message: 'Token no proporcionado en query params',
        },
      ]);
    }
    
    // Validar que sea string
    if (typeof token !== 'string') {
      return validationErrorResponse(res, [
        {
          field: 'token',
          message: 'Token debe ser una cadena de texto',
        },
      ]);
    }
    
    // Validar longitud minima
    if (token.length < 20) {
      return validationErrorResponse(res, [
        {
          field: 'token',
          message: 'Token demasiado corto',
        },
      ]);
    }
    
    // Validar que solo contenga caracteres alfanumericos, guiones y guiones bajos
    const validPattern = /^[A-Za-z0-9_-]+$/;
    if (!validPattern.test(token)) {
      return validationErrorResponse(res, [
        {
          field: 'token',
          message: 'Token contiene caracteres invalidos',
        },
      ]);
    }
    
    next();
  } catch (error) {
    console.error('Error en validateQueryToken middleware:', error);
    return validationErrorResponse(res, [
      {
        field: 'token',
        message: 'Error al validar token',
      },
    ]);
  }
};

/**
 * Middleware para validar refresh token
 * Los refresh tokens pueden tener formato diferente a los access tokens
 */
const validateRefreshToken = (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (!refreshToken) {
      return validationErrorResponse(res, [
        {
          field: 'refreshToken',
          message: 'Refresh token no proporcionado',
        },
      ]);
    }
    
    // Validar que sea string
    if (typeof refreshToken !== 'string') {
      return validationErrorResponse(res, [
        {
          field: 'refreshToken',
          message: 'Refresh token debe ser una cadena de texto',
        },
      ]);
    }
    
    // Validar longitud razonable
    if (refreshToken.length < 50 || refreshToken.length > 2000) {
      return validationErrorResponse(res, [
        {
          field: 'refreshToken',
          message: 'Longitud del refresh token fuera de rango',
        },
      ]);
    }
    
    // Validar formato JWT si aplica
    const tokenParts = refreshToken.split('.');
    if (tokenParts.length === 3) {
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
      for (let i = 0; i < tokenParts.length; i++) {
        if (!base64UrlPattern.test(tokenParts[i])) {
          return validationErrorResponse(res, [
            {
              field: 'refreshToken',
              message: 'Refresh token contiene caracteres invalidos',
            },
          ]);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error en validateRefreshToken middleware:', error);
    return validationErrorResponse(res, [
      {
        field: 'refreshToken',
        message: 'Error al validar refresh token',
      },
    ]);
  }
};

/**
 * Middleware para extraer token y adjuntarlo al request
 * No valida, solo extrae y hace disponible
 */
const extractToken = (req, res, next) => {
  try {
    let token = null;
    
    // Intentar obtener de Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Intentar obtener de cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Intentar obtener de query params (para casos especiales)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    // Adjuntar al request
    req.rawToken = token;
    
    next();
  } catch (error) {
    console.error('Error en extractToken middleware:', error);
    req.rawToken = null;
    next();
  }
};

module.exports = {
  validateToken,
  validateQueryToken,
  validateRefreshToken,
  extractToken,
};