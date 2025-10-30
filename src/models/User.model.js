// src/models/User.model.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, REGEX_PATTERNS } = require('../config/constants');

/**
 * Schema de Usuario
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'El nombre de usuario es requerido'],
      unique: true,
      trim: true,
      minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
      maxlength: [30, 'El nombre de usuario no puede exceder 30 caracteres'],
      match: [REGEX_PATTERNS.USERNAME, 'El nombre de usuario solo puede contener letras, numeros, guiones y guiones bajos'],
      index: true,
    },
    
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [255, 'El email no puede exceder 255 caracteres'],
      match: [REGEX_PATTERNS.EMAIL, 'Por favor ingrese un email valido'],
      index: true,
    },
    
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false,
    },
    
    avatar: {
      type: String,
      default: null,
    },
    
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
      language: {
        type: String,
        enum: ['es', 'en', 'fr', 'de', 'pt'],
        default: 'es',
      },
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    lastLogin: {
      type: Date,
      default: null,
    },
    
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    
    resetPasswordExpire: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indice compuesto para busquedas
 */
userSchema.index({ username: 1, email: 1 });

/**
 * Virtual para conversaciones del usuario
 */
userSchema.virtual('conversations', {
  ref: 'Conversation',
  localField: '_id',
  foreignField: 'userId',
});

/**
 * Middleware pre-save: hashear password antes de guardar
 */
userSchema.pre('save', async function (next) {
  // Solo hashear si el password fue modificado
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Metodo de instancia: comparar password
 * @param {string} enteredPassword - Password ingresado
 * @returns {Promise<boolean>} - True si coincide
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Metodo de instancia: obtener objeto publico del usuario
 * @returns {Object} - Usuario sin datos sensibles
 */
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    role: this.role,
    preferences: this.preferences,
    isActive: this.isActive,
    isVerified: this.isVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Metodo estatico: buscar usuario por email
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} - Usuario encontrado
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Metodo estatico: buscar usuario por username
 * @param {string} username - Username del usuario
 * @returns {Promise<Object>} - Usuario encontrado
 */
userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username: username }).select('+password');
};

/**
 * Metodo estatico: verificar si email existe
 * @param {string} email - Email a verificar
 * @returns {Promise<boolean>} - True si existe
 */
userSchema.statics.emailExists = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

/**
 * Metodo estatico: verificar si username existe
 * @param {string} username - Username a verificar
 * @returns {Promise<boolean>} - True si existe
 */
userSchema.statics.usernameExists = async function (username) {
  const user = await this.findOne({ username: username });
  return !!user;
};

/**
 * Metodo de instancia: actualizar ultimo login
 */
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = Date.now();
  return this.save({ validateBeforeSave: false });
};

/**
 * Middleware pre-remove: limpiar datos relacionados
 */
userSchema.pre('remove', async function (next) {
  try {
    // Eliminar conversaciones del usuario
    await this.model('Conversation').deleteMany({ userId: this._id });
    
    // Eliminar sesiones del usuario
    await this.model('Session').deleteMany({ userId: this._id });
    
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;