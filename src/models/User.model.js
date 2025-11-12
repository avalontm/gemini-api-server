// src/models/User.model.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { USER_ROLES, CARRERAS, REGEX_PATTERNS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    numeroControl: {
      type: String,
      required: [true, 'El numero de control es requerido'],
      unique: true,
      trim: true,
      match: [/^\d{8}$/, 'El numero de control debe tener 8 digitos'],
      index: true,
    },
    
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^al\d{8}@ite\.edu\.mx$/, 'El email debe tener el formato: al[numeroControl]@ite.edu.mx'],
      index: true,
    },
    
    password: {
      type: String,
      required: [true, 'La contrasena es requerida'],
      minlength: [6, 'La contrasena debe tener al menos 6 caracteres'],
      select: false,
    },
    
    nombreCompleto: {
      type: String,
      required: [true, 'El nombre completo es requerido'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    
    carrera: {
      type: String,
      required: [true, 'La carrera es requerida'],
      enum: {
        values: Object.values(CARRERAS),
        message: 'Carrera no valida'
      },
    },
    
    semestre: {
      type: Number,
      required: [true, 'El semestre es requerido'],
      min: [1, 'El semestre debe ser minimo 1'],
      max: [12, 'El semestre no puede exceder 12'],
    },
    
    avatar: {
      type: String,
      default: null,
      maxlength: [5000000, 'El avatar es demasiado grande'],
    },
    
    telefono: {
      type: String,
      default: null,
      trim: true,
      match: [/^[0-9]{10}$/, 'El telefono debe tener 10 digitos'],
    },
    
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.ALUMNO,
    },
    
    // Nueva seccion para API key personal de Gemini
    geminiApiKey: {
      type: String,
      default: null,
      select: false,
    },
    
    geminiApiKeyStatus: {
      isActive: {
        type: Boolean,
        default: false,
      },
      lastValidated: {
        type: Date,
        default: null,
      },
      lastError: {
        type: String,
        default: null,
      },
    },
    
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      language: {
        type: String,
        enum: ['es', 'en'],
        default: 'es'
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        updates: { type: Boolean, default: true },
        tips: { type: Boolean, default: true }
      },
      usePersonalApiKey: {
        type: Boolean,
        default: false,
      },
      usePersonalModel: {
      type: Boolean,
      default: false
    },
   // src/models/User.model.js

geminiModel: {
  type: String,
  enum: [
    // Gemini 2.5 (Más recientes - Recomendados)
    'gemini-2.5-pro',           // Pensamiento avanzado
    'gemini-2.5-flash',         // Mejor precio-rendimiento
    'gemini-2.5-flash-lite',    // Ultra rápido
    
    // Gemini 2.0 (Segunda generación)
    'gemini-2.0-flash',         // Versátil y confiable
    'gemini-2.0-flash-lite',    // Pequeño y rápido
    
    // Gemini 1.5 (Primera generación - Probados)
    'gemini-1.5-pro',           // Análisis profundo
    'gemini-1.5-flash',         // Excelente para imágenes
    'gemini-1.5-flash-8b',      // Compacto
    
    // Aliases dinámicos (Latest)
    'gemini-flash-latest',      // Última versión de Flash
    'gemini-pro-latest',        // Última versión de Pro
    
    null // null = usar el del servidor
  ],
  default: null
}
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
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    
    emailVerificationExpire: {
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

userSchema.index({ numeroControl: 1 });
userSchema.index({ email: 1 });
userSchema.index({ carrera: 1, semestre: 1 });

userSchema.virtual('conversations', {
  ref: 'Conversation',
  localField: '_id',
  foreignField: 'userId',
});

userSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('numeroControl')) {
    this.email = `al${this.numeroControl}@ite.edu.mx`;
  }
  next();
});

userSchema.pre('save', async function (next) {
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

userSchema.pre('save', function (next) {
  if (!this.isModified('geminiApiKey')) {
    return next();
  }
  
  if (this.geminiApiKey && this.geminiApiKey.trim() !== '') {
    try {
      if (!this.geminiApiKey.includes(':')) {
        this.geminiApiKey = this.encryptApiKey(this.geminiApiKey);
      }
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.encryptApiKey = function (apiKey) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

userSchema.methods.decryptApiKey = function (encryptedApiKey) {
  if (!encryptedApiKey || encryptedApiKey.trim() === '') {
    return null;
  }
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);
    
    const parts = encryptedApiKey.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error desencriptando API key:', error.message);
    return null;
  }
};

userSchema.methods.getGeminiApiKey = function () {
  console.log('=== DEBUG getGeminiApiKey ===');
  console.log('usePersonalApiKey:', this.preferences.usePersonalApiKey);
  console.log('has geminiApiKey:', !!this.geminiApiKey);
  console.log('isActive:', this.geminiApiKeyStatus.isActive);
  
  // Verificar explícitamente si NO debe usar la personal
  if (this.preferences.usePersonalApiKey === false) {
    console.log('Usuario NO quiere usar API key personal');
    return process.env.GEMINI_API_KEY;
  }
  
  // Si quiere usar su API key personal, verificar que exista y esté activa
  if (this.preferences.usePersonalApiKey && this.geminiApiKey) {
    const decryptedKey = this.decryptApiKey(this.geminiApiKey);
    console.log('API key desencriptada:', decryptedKey ? 'SI' : 'NO');
    console.log('Primeros 10 chars:', decryptedKey ? decryptedKey.substring(0, 10) : 'null');
    
    if (decryptedKey && this.geminiApiKeyStatus.isActive) {
      console.log('Retornando API key PERSONAL');
      return decryptedKey;
    } else {
      console.log('Desencriptación falló o no está activa');
    }
  }
  
  // Por defecto, usar la API key del servidor
  console.log('Retornando API key del SERVIDOR (fallback)');
  return process.env.GEMINI_API_KEY;
};

/**
 * Obtiene el modelo de Gemini a usar para este usuario
 * @returns {string|null} - Nombre del modelo o null para usar el del servidor
 */
userSchema.methods.getGeminiModel = function() {
  // Si el usuario decidió usar modelo personal Y tiene uno configurado
  if (this.preferences?.usePersonalModel && this.preferences?.geminiModel) {
    return this.preferences.geminiModel;
  }
  
  // Si no, retornar null para que use el del servidor
  return null;
};

/**
 * Verifica si el usuario está usando su propio modelo
 * @returns {boolean}
 */
userSchema.methods.isUsingPersonalModel = function() {
  return !!(this.preferences?.usePersonalModel && this.preferences?.geminiModel);
};

/**
 * Actualiza la preferencia de modelo del usuario
 * @param {string} model - Nombre del modelo
 * @param {boolean} usePersonal - Si debe usar el modelo personal
 */
userSchema.methods.updateGeminiModel = async function(model, usePersonal = true) {
  this.preferences = this.preferences || {};
  this.preferences.geminiModel = model;
  this.preferences.usePersonalModel = usePersonal;
  return await this.save();
};

userSchema.methods.hasPersonalApiKey = function () {
  return !!(this.geminiApiKey && 
            this.preferences.usePersonalApiKey && 
            this.geminiApiKeyStatus.isActive);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    numeroControl: this.numeroControl,
    email: this.email,
    nombreCompleto: this.nombreCompleto,
    carrera: this.carrera,
    semestre: this.semestre,
    avatar: this.avatar,
    telefono: this.telefono,
    role: this.role,
    preferences: this.preferences,
    isActive: this.isActive,
    isVerified: this.isVerified,
    lastLogin: this.lastLogin,
    geminiApiKeyStatus: {
      hasPersonalKey: !!this.geminiApiKey,
      isActive: this.geminiApiKeyStatus.isActive,
      lastValidated: this.geminiApiKeyStatus.lastValidated,
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

userSchema.statics.findByNumeroControl = function (numeroControl) {
  return this.findOne({ numeroControl }).select('+password');
};

userSchema.statics.emailExists = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

userSchema.statics.numeroControlExists = async function (numeroControl) {
  const user = await this.findOne({ numeroControl });
  return !!user;
};

userSchema.statics.findByCarrera = function (carrera, semestre = null) {
  const query = { carrera };
  if (semestre) {
    query.semestre = semestre;
  }
  return this.find(query).sort({ nombreCompleto: 1 });
};

userSchema.methods.updateLastLogin = function () {
  this.lastLogin = Date.now();
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.generateEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
  
  return verificationToken;
};

userSchema.pre('remove', async function (next) {
  try {
    await this.model('Conversation').deleteMany({ userId: this._id });
    await this.model('Session').deleteMany({ userId: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;