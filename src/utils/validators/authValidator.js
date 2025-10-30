// src/utils/validators/authValidator.js

const { REGEX_PATTERNS, CONTENT_LIMITS } = require('../../config/constants');

/**
 * Validadores para autenticacion y usuarios
 */

/**
 * Validar email
 * @param {string} email - Email a validar
 * @returns {Object} - Resultado de validacion
 */
const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push('El email es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof email !== 'string') {
    errors.push('El email debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    errors.push('El email no puede estar vacio');
  }
  
  if (trimmedEmail.length > CONTENT_LIMITS.EMAIL_MAX_LENGTH) {
    errors.push(`El email no puede exceder ${CONTENT_LIMITS.EMAIL_MAX_LENGTH} caracteres`);
  }
  
  if (!REGEX_PATTERNS.EMAIL.test(trimmedEmail)) {
    errors.push('El formato del email es invalido');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedEmail.toLowerCase(),
  };
};

/**
 * Validar username
 * @param {string} username - Username a validar
 * @returns {Object} - Resultado de validacion
 */
const validateUsername = (username) => {
  const errors = [];
  
  if (!username) {
    errors.push('El nombre de usuario es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof username !== 'string') {
    errors.push('El nombre de usuario debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedUsername = username.trim();
  
  if (trimmedUsername.length < CONTENT_LIMITS.USERNAME_MIN_LENGTH) {
    errors.push(`El nombre de usuario debe tener al menos ${CONTENT_LIMITS.USERNAME_MIN_LENGTH} caracteres`);
  }
  
  if (trimmedUsername.length > CONTENT_LIMITS.USERNAME_MAX_LENGTH) {
    errors.push(`El nombre de usuario no puede exceder ${CONTENT_LIMITS.USERNAME_MAX_LENGTH} caracteres`);
  }
  
  if (!REGEX_PATTERNS.USERNAME.test(trimmedUsername)) {
    errors.push('El nombre de usuario solo puede contener letras, numeros, guiones y guiones bajos');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedUsername,
  };
};

/**
 * Validar password
 * @param {string} password - Password a validar
 * @param {boolean} requireStrong - Si requiere password fuerte
 * @returns {Object} - Resultado de validacion
 */
const validatePassword = (password, requireStrong = false) => {
  const errors = [];
  
  if (!password) {
    errors.push('La contraseña es requerida');
    return { isValid: false, errors };
  }
  
  if (typeof password !== 'string') {
    errors.push('La contraseña debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  if (password.length < CONTENT_LIMITS.PASSWORD_MIN_LENGTH) {
    errors.push(`La contraseña debe tener al menos ${CONTENT_LIMITS.PASSWORD_MIN_LENGTH} caracteres`);
  }
  
  if (password.length > CONTENT_LIMITS.PASSWORD_MAX_LENGTH) {
    errors.push(`La contraseña no puede exceder ${CONTENT_LIMITS.PASSWORD_MAX_LENGTH} caracteres`);
  }
  
  if (requireStrong) {
    if (!REGEX_PATTERNS.PASSWORD.test(password)) {
      errors.push('La contraseña debe contener al menos una mayuscula, una minuscula y un numero');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar que dos passwords coincidan
 * @param {string} password - Password
 * @param {string} confirmPassword - Confirmacion de password
 * @returns {Object} - Resultado de validacion
 */
const validatePasswordMatch = (password, confirmPassword) => {
  const errors = [];
  
  if (!password || !confirmPassword) {
    errors.push('Ambas contraseñas son requeridas');
    return { isValid: false, errors };
  }
  
  if (password !== confirmPassword) {
    errors.push('Las contraseñas no coinciden');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validar datos de registro
 * @param {Object} data - Datos de registro
 * @returns {Object} - Resultado de validacion
 */
const validateRegisterData = (data) => {
  const errors = [];
  const sanitized = {};
  
  // Validar email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  } else {
    sanitized.email = emailValidation.sanitized;
  }
  
  // Validar username
  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.isValid) {
    errors.push(...usernameValidation.errors);
  } else {
    sanitized.username = usernameValidation.sanitized;
  }
  
  // Validar password
  const passwordValidation = validatePassword(data.password, true);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  } else {
    sanitized.password = data.password;
  }
  
  // Validar confirmacion de password si existe
  if (data.confirmPassword) {
    const matchValidation = validatePasswordMatch(data.password, data.confirmPassword);
    if (!matchValidation.isValid) {
      errors.push(...matchValidation.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

/**
 * Validar datos de login
 * @param {Object} data - Datos de login
 * @returns {Object} - Resultado de validacion
 */
const validateLoginData = (data) => {
  const errors = [];
  const sanitized = {};
  
  // Validar email o username
  if (!data.email && !data.username) {
    errors.push('Email o nombre de usuario es requerido');
  } else {
    if (data.email) {
      const emailValidation = validateEmail(data.email);
      if (!emailValidation.isValid) {
        errors.push(...emailValidation.errors);
      } else {
        sanitized.email = emailValidation.sanitized;
      }
    }
    
    if (data.username) {
      const usernameValidation = validateUsername(data.username);
      if (!usernameValidation.isValid) {
        errors.push(...usernameValidation.errors);
      } else {
        sanitized.username = usernameValidation.sanitized;
      }
    }
  }
  
  // Validar password
  if (!data.password) {
    errors.push('La contraseña es requerida');
  } else {
    sanitized.password = data.password;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

/**
 * Validar token JWT
 * @param {string} token - Token a validar
 * @returns {Object} - Resultado de validacion
 */
const validateToken = (token) => {
  const errors = [];
  
  if (!token) {
    errors.push('El token es requerido');
    return { isValid: false, errors };
  }
  
  if (typeof token !== 'string') {
    errors.push('El token debe ser una cadena de texto');
    return { isValid: false, errors };
  }
  
  const trimmedToken = token.trim();
  
  if (trimmedToken.length === 0) {
    errors.push('El token no puede estar vacio');
  }
  
  // Validar formato basico de JWT (tres partes separadas por puntos)
  const parts = trimmedToken.split('.');
  if (parts.length !== 3) {
    errors.push('El formato del token es invalido');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedToken,
  };
};

/**
 * Validar actualizacion de perfil
 * @param {Object} data - Datos a actualizar
 * @returns {Object} - Resultado de validacion
 */
const validateProfileUpdate = (data) => {
  const errors = [];
  const sanitized = {};
  
  // Validar username si existe
  if (data.username) {
    const usernameValidation = validateUsername(data.username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    } else {
      sanitized.username = usernameValidation.sanitized;
    }
  }
  
  // Validar email si existe
  if (data.email) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    } else {
      sanitized.email = emailValidation.sanitized;
    }
  }
  
  // Validar avatar si existe
  if (data.avatar) {
    if (typeof data.avatar !== 'string') {
      errors.push('El avatar debe ser una cadena de texto (URL)');
    } else if (data.avatar.length > 500) {
      errors.push('La URL del avatar no puede exceder 500 caracteres');
    } else {
      sanitized.avatar = data.avatar.trim();
    }
  }
  
  // Validar preferencias si existen
  if (data.preferences) {
    if (typeof data.preferences !== 'object') {
      errors.push('Las preferencias deben ser un objeto');
    } else {
      sanitized.preferences = {};
      
      if (data.preferences.theme) {
        const validThemes = ['light', 'dark', 'auto'];
        if (!validThemes.includes(data.preferences.theme)) {
          errors.push('El tema debe ser: light, dark o auto');
        } else {
          sanitized.preferences.theme = data.preferences.theme;
        }
      }
      
      if (data.preferences.language) {
        const validLanguages = ['es', 'en', 'fr', 'de', 'pt'];
        if (!validLanguages.includes(data.preferences.language)) {
          errors.push('El idioma no es valido');
        } else {
          sanitized.preferences.language = data.preferences.language;
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
  validatePasswordMatch,
  validateRegisterData,
  validateLoginData,
  validateToken,
  validateProfileUpdate,
};