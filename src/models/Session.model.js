// src/models/Session.model.js

const mongoose = require('mongoose');

/**
 * Schema de Sesion
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El ID de usuario es requerido'],
      index: true,
    },
    
    token: {
      type: String,
      required: [true, 'El token es requerido'],
      unique: true,
      index: true,
    },
    
    ipAddress: {
      type: String,
      required: [true, 'La direccion IP es requerida'],
    },
    
    userAgent: {
      type: String,
      required: [true, 'El user agent es requerido'],
    },
    
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown',
      },
      browser: {
        type: String,
        default: 'unknown',
      },
      os: {
        type: String,
        default: 'unknown',
      },
    },
    
    location: {
      country: {
        type: String,
        default: null,
      },
      city: {
        type: String,
        default: null,
      },
      coordinates: {
        latitude: {
          type: Number,
          default: null,
        },
        longitude: {
          type: Number,
          default: null,
        },
      },
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    
    expiresAt: {
      type: Date,
      required: [true, 'La fecha de expiracion es requerida'],
      index: true,
    },
    
    revokedAt: {
      type: Date,
      default: null,
    },
    
    revokedReason: {
      type: String,
      enum: ['logout', 'expired', 'security', 'manual', null],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indices compuestos para mejorar rendimiento
 */
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ token: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 });

/**
 * Virtual para verificar si la sesion esta expirada
 */
sessionSchema.virtual('isExpired').get(function () {
  return this.expiresAt < Date.now();
});

/**
 * Virtual para verificar si la sesion es valida
 */
sessionSchema.virtual('isValid').get(function () {
  return this.isActive && !this.isExpired && !this.revokedAt;
});

/**
 * Metodo de instancia: actualizar actividad
 * @returns {Promise<Object>} - Sesion actualizada
 */
sessionSchema.methods.updateActivity = async function () {
  this.lastActivity = Date.now();
  return await this.save();
};

/**
 * Metodo de instancia: revocar sesion
 * @param {string} reason - Razon de revocacion
 * @returns {Promise<Object>} - Sesion actualizada
 */
sessionSchema.methods.revoke = async function (reason = 'manual') {
  this.isActive = false;
  this.revokedAt = Date.now();
  this.revokedReason = reason;
  return await this.save();
};

/**
 * Metodo de instancia: extender sesion
 * @param {number} hours - Horas a extender
 * @returns {Promise<Object>} - Sesion actualizada
 */
sessionSchema.methods.extend = async function (hours = 24) {
  const newExpiry = new Date(this.expiresAt);
  newExpiry.setHours(newExpiry.getHours() + hours);
  this.expiresAt = newExpiry;
  return await this.save();
};

/**
 * Metodo estatico: encontrar sesion por token
 * @param {string} token - Token de sesion
 * @returns {Promise<Object>} - Sesion encontrada
 */
sessionSchema.statics.findByToken = function (token) {
  return this.findOne({ token, isActive: true }).populate('userId');
};

/**
 * Metodo estatico: encontrar sesiones activas por usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de sesiones
 */
sessionSchema.statics.findActiveByUserId = function (userId) {
  return this.find({ 
    userId, 
    isActive: true,
    expiresAt: { $gt: Date.now() },
  }).sort({ lastActivity: -1 });
};

/**
 * Metodo estatico: revocar todas las sesiones de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} reason - Razon de revocacion
 * @returns {Promise<Object>} - Resultado de la operacion
 */
sessionSchema.statics.revokeAllByUserId = async function (userId, reason = 'security') {
  return await this.updateMany(
    { userId, isActive: true },
    {
      isActive: false,
      revokedAt: Date.now(),
      revokedReason: reason,
    }
  );
};

/**
 * Metodo estatico: limpiar sesiones expiradas
 * @returns {Promise<Object>} - Resultado de la operacion
 */
sessionSchema.statics.cleanupExpired = async function () {
  return await this.deleteMany({
    $or: [
      { expiresAt: { $lt: Date.now() } },
      { isActive: false, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    ],
  });
};

/**
 * Metodo estatico: contar sesiones activas por usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<number>} - Cantidad de sesiones
 */
sessionSchema.statics.countActiveByUserId = function (userId) {
  return this.countDocuments({ 
    userId, 
    isActive: true,
    expiresAt: { $gt: Date.now() },
  });
};

/**
 * Metodo estatico: obtener sesiones por IP
 * @param {string} ipAddress - Direccion IP
 * @returns {Promise<Array>} - Lista de sesiones
 */
sessionSchema.statics.findByIpAddress = function (ipAddress) {
  return this.find({ ipAddress, isActive: true })
    .sort({ lastActivity: -1 })
    .populate('userId', 'username email');
};

/**
 * Metodo estatico: validar token
 * @param {string} token - Token a validar
 * @returns {Promise<Object|null>} - Sesion si es valida, null si no
 */
sessionSchema.statics.validateToken = async function (token) {
  const session = await this.findOne({ token, isActive: true }).populate('userId');
  
  if (!session) {
    return null;
  }
  
  if (session.expiresAt < Date.now()) {
    await session.revoke('expired');
    return null;
  }
  
  return session;
};

/**
 * Middleware pre-save: validar que expiresAt sea futuro
 */
sessionSchema.pre('save', function (next) {
  if (this.isNew && this.expiresAt < Date.now()) {
    return next(new Error('La fecha de expiracion debe ser futura'));
  }
  next();
});

/**
 * Middleware para limpiar sesiones expiradas automaticamente
 * Se ejecuta cada hora
 */
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      const Session = mongoose.model('Session');
      const result = await Session.cleanupExpired();
      if (result.deletedCount > 0) {
        console.log(`Limpieza de sesiones: ${result.deletedCount} sesiones eliminadas`);
      }
    } catch (error) {
      console.error('Error al limpiar sesiones expiradas:', error);
    }
  }, 60 * 60 * 1000); // Cada hora
}

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;