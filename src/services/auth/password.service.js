// src/services/auth/password.service.js

const bcrypt = require('bcryptjs');

class PasswordService {
  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  }

  /**
   * Hashea una contrasena usando bcrypt
   * @param {string} password - Contrasena en texto plano
   * @returns {Promise<string>} - Contrasena hasheada
   */
  async hashPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('La contrasena debe ser un string valido');
      }

      if (password.length < 8) {
        throw new Error('La contrasena debe tener al menos 8 caracteres');
      }

      const salt = await bcrypt.genSalt(this.saltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      return hashedPassword;
    } catch (error) {
      throw new Error(`Error hasheando contrasena: ${error.message}`);
    }
  }

  /**
   * Compara una contrasena en texto plano con una hasheada
   * @param {string} password - Contrasena en texto plano
   * @param {string} hashedPassword - Contrasena hasheada
   * @returns {Promise<boolean>} - true si coinciden, false si no
   */
  async comparePassword(password, hashedPassword) {
    try {
      if (!password || !hashedPassword) {
        throw new Error('Se requieren ambas contrasenas para comparar');
      }

      if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
        throw new Error('Las contrasenas deben ser strings');
      }

      const isMatch = await bcrypt.compare(password, hashedPassword);
      
      return isMatch;
    } catch (error) {
      throw new Error(`Error comparando contrasenas: ${error.message}`);
    }
  }

  /**
   * Valida la fortaleza de una contrasena
   * @param {string} password - Contrasena a validar
   * @returns {Object} - Objeto con isValid y errores
   */
  validatePasswordStrength(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
      return {
        isValid: false,
        errors: ['La contrasena debe ser un string valido']
      };
    }

    if (password.length < 8) {
      errors.push('La contrasena debe tener al menos 8 caracteres');
    }

    if (password.length > 128) {
      errors.push('La contrasena no puede exceder 128 caracteres');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('La contrasena debe contener al menos una letra minuscula');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('La contrasena debe contener al menos una letra mayuscula');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('La contrasena debe contener al menos un numero');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('La contrasena debe contener al menos un caracter especial');
    }

    const commonPasswords = [
      'password', '12345678', 'qwerty', 'abc123', 
      'password123', '123456789', '12345', '1234567890'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('La contrasena es demasiado comun');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Genera una contrasena aleatoria segura
   * @param {number} length - Longitud de la contrasena (default: 16)
   * @returns {string} - Contrasena generada
   */
  generateRandomPassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    
    let password = '';
    
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    return password;
  }

  /**
   * Verifica si una contrasena ha sido comprometida (simulacion)
   * En produccion, esto deberia consultar APIs como HaveIBeenPwned
   * @param {string} password - Contrasena a verificar
   * @returns {Promise<boolean>} - true si esta comprometida
   */
  async isPasswordCompromised(password) {
    const commonPasswords = [
      'password', '12345678', 'qwerty', 'abc123',
      'password123', '123456789', 'letmein', 'welcome'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }
}

module.exports = new PasswordService();