// src/models/User.model.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
      match: [/^\d{8}@ite\.edu\.mx$/, 'El email debe tener el formato: [numeroControl]@ite.edu.mx'],
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

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
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
    isActive: this.isActive,
    isVerified: this.isVerified,
    lastLogin: this.lastLogin,
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