// src/middlewares/auth/authorize.js

const { forbiddenResponse } = require('../../utils/helpers/responseFormatter');
const { errorMessages } = require('../../utils/helpers/errorMessages');

/**
 * Middleware para verificar roles de usuario
 * Debe usarse despues del middleware authenticate
 * @param  {...string} allowedRoles - Roles permitidos
 * @returns {Function} - Middleware function
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Verificar que el usuario este autenticado
    if (!req.user) {
      return forbiddenResponse(
        res,
        errorMessages.permission.FORBIDDEN
      );
    }

    // Verificar que el usuario tenga un rol asignado
    if (!req.user.role) {
      return forbiddenResponse(
        res,
        errorMessages.permission.INSUFFICIENT_PRIVILEGES
      );
    }

    // Verificar si el rol del usuario esta en los roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return forbiddenResponse(
        res,
        errorMessages.permission.INSUFFICIENT_PRIVILEGES
      );
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario sea administrador
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return forbiddenResponse(
      res,
      errorMessages.permission.FORBIDDEN
    );
  }

  if (req.user.role !== 'admin') {
    return forbiddenResponse(
      res,
      errorMessages.permission.ADMIN_REQUIRED
    );
  }

  next();
};

/**
 * Middleware para verificar que el usuario sea el propietario del recurso
 * Compara el userId del request con el userId del recurso
 * @param {string} resourceUserField - Campo que contiene el userId en el recurso
 * @returns {Function} - Middleware function
 */
const requireOwnership = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(
        res,
        errorMessages.permission.FORBIDDEN
      );
    }

    // El recurso puede estar en req.resource (si fue cargado por otro middleware)
    // o en req.params
    let resourceUserId = null;

    if (req.resource && req.resource[resourceUserField]) {
      resourceUserId = req.resource[resourceUserField].toString();
    } else if (req.params && req.params[resourceUserField]) {
      resourceUserId = req.params[resourceUserField];
    }

    // Si no se encuentra el userId del recurso, denegar acceso
    if (!resourceUserId) {
      return forbiddenResponse(
        res,
        errorMessages.permission.OWNER_REQUIRED
      );
    }

    // Comparar userId del usuario autenticado con el del recurso
    const currentUserId = req.user._id.toString();

    if (currentUserId !== resourceUserId) {
      // Los administradores pueden acceder a todo
      if (req.user.role === 'admin') {
        return next();
      }

      return forbiddenResponse(
        res,
        errorMessages.permission.OWNER_REQUIRED
      );
    }

    next();
  };
};

/**
 * Middleware para verificar ownership o admin
 * Permite acceso si el usuario es propietario o administrador
 * @param {string} resourceUserField - Campo que contiene el userId en el recurso
 * @returns {Function} - Middleware function
 */
const requireOwnershipOrAdmin = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(
        res,
        errorMessages.permission.FORBIDDEN
      );
    }

    // Si es admin, permitir acceso inmediatamente
    if (req.user.role === 'admin') {
      return next();
    }

    // Si no es admin, verificar ownership
    let resourceUserId = null;

    if (req.resource && req.resource[resourceUserField]) {
      resourceUserId = req.resource[resourceUserField].toString();
    } else if (req.params && req.params[resourceUserField]) {
      resourceUserId = req.params[resourceUserField];
    }

    if (!resourceUserId) {
      return forbiddenResponse(
        res,
        errorMessages.permission.OWNER_REQUIRED
      );
    }

    const currentUserId = req.user._id.toString();

    if (currentUserId !== resourceUserId) {
      return forbiddenResponse(
        res,
        errorMessages.permission.OWNER_REQUIRED
      );
    }

    next();
  };
};

/**
 * Middleware para verificar permisos especificos
 * @param  {...string} requiredPermissions - Permisos requeridos
 * @returns {Function} - Middleware function
 */
const requirePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(
        res,
        errorMessages.permission.FORBIDDEN
      );
    }

    // Verificar que el usuario tenga permisos asignados
    if (!req.user.permissions || !Array.isArray(req.user.permissions)) {
      return forbiddenResponse(
        res,
        errorMessages.permission.INSUFFICIENT_PRIVILEGES
      );
    }

    // Verificar que el usuario tenga todos los permisos requeridos
    const hasAllPermissions = requiredPermissions.every(permission =>
      req.user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return forbiddenResponse(
        res,
        errorMessages.permission.INSUFFICIENT_PRIVILEGES
      );
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario sea el mismo del parametro
 * Util para rutas como /api/users/:userId
 */
const requireSameUser = (req, res, next) => {
  if (!req.user) {
    return forbiddenResponse(
      res,
      errorMessages.permission.FORBIDDEN
    );
  }

  const targetUserId = req.params.userId || req.params.id;
  const currentUserId = req.user._id.toString();

  if (currentUserId !== targetUserId) {
    // Los administradores pueden acceder
    if (req.user.role === 'admin') {
      return next();
    }

    return forbiddenResponse(
      res,
      errorMessages.permission.FORBIDDEN
    );
  }

  next();
};

module.exports = {
  authorize,
  requireAdmin,
  requireOwnership,
  requireOwnershipOrAdmin,
  requirePermissions,
  requireSameUser,
};