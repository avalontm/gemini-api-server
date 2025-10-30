// src/services/auth/token.service.js

const jwt = require('jsonwebtoken');

class TokenService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'default_secret_change_in_production';
    this.expiresIn = process.env.JWT_EXPIRE || '7d';
    this.cookieExpire = parseInt(process.env.JWT_COOKIE_EXPIRE) || 7;
  }

  /**
   * Genera un token JWT para un usuario
   * @param {Object} payload - Datos del usuario a incluir en el token
   * @param {string} payload.id - ID del usuario
   * @param {string} payload.email - Email del usuario
   * @param {string} payload.role - Rol del usuario
   * @returns {string} - Token JWT generado
   */
  generateToken(payload) {
    try {
      if (!payload || !payload.id) {
        throw new Error('El payload debe contener al menos el ID del usuario');
      }

      const tokenPayload = {
        id: payload.id,
        email: payload.email,
        role: payload.role || 'user',
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(tokenPayload, this.secret, {
        expiresIn: this.expiresIn,
        issuer: 'gemini-api-server',
        audience: 'gemini-api-client'
      });

      return token;
    } catch (error) {
      throw new Error(`Error generando token: ${error.message}`);
    }
  }

  /**
   * Verifica y decodifica un token JWT
   * @param {string} token - Token JWT a verificar
   * @returns {Object} - Payload decodificado del token
   */
  verifyToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token invalido');
      }

      const decoded = jwt.verify(token, this.secret, {
        issuer: 'gemini-api-server',
        audience: 'gemini-api-client'
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token invalido o malformado');
      }
      
      if (error.name === 'NotBeforeError') {
        throw new Error('Token aun no es valido');
      }

      throw new Error(`Error verificando token: ${error.message}`);
    }
  }

  /**
   * Decodifica un token sin verificar su firma (solo para inspeccion)
   * @param {string} token - Token JWT a decodificar
   * @returns {Object} - Payload decodificado
   */
  decodeToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token invalido');
      }

      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        throw new Error('No se pudo decodificar el token');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Error decodificando token: ${error.message}`);
    }
  }

  /**
   * Extrae el token del header Authorization
   * @param {string} authHeader - Header de autorizacion
   * @returns {string|null} - Token extraido o null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verifica si un token esta expirado
   * @param {string} token - Token JWT a verificar
   * @returns {boolean} - true si esta expirado
   */
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      
      if (!decoded.payload.exp) {
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      
      return decoded.payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Obtiene el tiempo restante de un token en segundos
   * @param {string} token - Token JWT
   * @returns {number} - Segundos restantes o 0 si expirado
   */
  getTokenRemainingTime(token) {
    try {
      const decoded = this.decodeToken(token);
      
      if (!decoded.payload.exp) {
        return 0;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const remaining = decoded.payload.exp - currentTime;
      
      return remaining > 0 ? remaining : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Genera un refresh token con mayor duracion
   * @param {Object} payload - Datos del usuario
   * @returns {string} - Refresh token generado
   */
  generateRefreshToken(payload) {
    try {
      if (!payload || !payload.id) {
        throw new Error('El payload debe contener al menos el ID del usuario');
      }

      const tokenPayload = {
        id: payload.id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      };

      const refreshToken = jwt.sign(tokenPayload, this.secret, {
        expiresIn: '30d',
        issuer: 'gemini-api-server',
        audience: 'gemini-api-client'
      });

      return refreshToken;
    } catch (error) {
      throw new Error(`Error generando refresh token: ${error.message}`);
    }
  }

  /**
   * Verifica si un token es un refresh token valido
   * @param {string} token - Token a verificar
   * @returns {boolean} - true si es un refresh token valido
   */
  isRefreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      return decoded.type === 'refresh';
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene opciones para cookie del token
   * @returns {Object} - Opciones de cookie
   */
  getCookieOptions() {
    return {
      expires: new Date(Date.now() + this.cookieExpire * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };
  }

  /**
   * Invalida un token (requiere lista negra en produccion)
   * @param {string} token - Token a invalidar
   * @returns {boolean} - true si se invalido exitosamente
   */
  invalidateToken(token) {
    try {
      // En produccion, esto deberia agregar el token a una lista negra en Redis
      // Por ahora, solo verificamos que sea un token valido
      this.verifyToken(token);
      
      // Aqui iria la logica para agregar a blacklist
      // await redisClient.set(`blacklist:${token}`, 'true', 'EX', remainingTime);
      
      return true;
    } catch (error) {
      throw new Error(`Error invalidando token: ${error.message}`);
    }
  }
}

module.exports = new TokenService();