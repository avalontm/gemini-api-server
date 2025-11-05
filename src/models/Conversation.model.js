// src/models/Conversation.model.js

const mongoose = require('mongoose');
const { CONTENT_LIMITS } = require('../config/constants');

/**
 * Schema de Conversacion
 */
const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El ID de usuario es requerido'],
      index: true,
    },
    
    title: {
      type: String,
      required: [true, 'El titulo es requerido'],
      trim: true,
      minlength: [CONTENT_LIMITS.CONVERSATION_TITLE_MIN_LENGTH, 'El titulo debe tener al menos 1 caracter'],
      maxlength: [CONTENT_LIMITS.CONVERSATION_TITLE_MAX_LENGTH, 'El titulo no puede exceder 200 caracteres'],
    },
    
    tags: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function (tags) {
            return tags.length <= CONTENT_LIMITS.MAX_TAGS_PER_CONVERSATION;
          },
          message: `No se pueden tener mas de ${CONTENT_LIMITS.MAX_TAGS_PER_CONVERSATION} tags`,
        },
        {
          validator: function (tags) {
            return tags.every(tag => tag.length <= CONTENT_LIMITS.TAG_MAX_LENGTH);
          },
          message: `Cada tag no puede exceder ${CONTENT_LIMITS.TAG_MAX_LENGTH} caracteres`,
        },
      ],
    },
    
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    
    tokenUsage: {
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
      estimatedCost: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    
    isArchived: {
      type: Boolean,
      default: false,
    },
    
    isPinned: {
      type: Boolean,
      default: false,
    },
    
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function(v) {
          return typeof v === 'object' && v !== null;
        },
        message: 'Metadata debe ser un objeto'
      }
    }
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
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ userId: 1, isPinned: -1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, isArchived: 1 });
conversationSchema.index({ tags: 1 });
conversationSchema.index({ 'metadata.area': 1 });
conversationSchema.index({ 'metadata.academicMode': 1 });

/**
 * Virtual para obtener numero de mensajes
 */
conversationSchema.virtual('messagesCount').get(function () {
  if (!this.messages || !Array.isArray(this.messages)) {
    return this.messageCount || 0;
  }
  return this.messages.length;
});

/**
 * Virtual para verificar si es conversacion academica
 */
conversationSchema.virtual('isAcademic').get(function () {
  return this.metadata?.academicMode === true || this.tags.includes('academico');
});

/**
 * Metodo de instancia: agregar mensaje a la conversacion
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.addMessage = async function (messageId) {
  this.messages.push(messageId);
  this.messageCount = this.messages.length;
  this.lastMessageAt = Date.now();
  return await this.save();
};

/**
 * Metodo de instancia: eliminar mensaje de la conversacion
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.removeMessage = async function (messageId) {
  this.messages = this.messages.filter(id => id.toString() !== messageId.toString());
  this.messageCount = this.messages.length;
  return await this.save();
};

/**
 * Metodo de instancia: actualizar uso de tokens
 * @param {number} tokens - Cantidad de tokens usados
 * @param {number} cost - Costo estimado
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.updateTokenUsage = async function (tokens, cost = 0) {
  this.tokenUsage.total += tokens;
  this.tokenUsage.estimatedCost += cost;
  return await this.save();
};

/**
 * Metodo de instancia: actualizar metadata
 * @param {Object} metadataUpdates - Actualizaciones de metadata
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.updateMetadata = async function (metadataUpdates) {
  this.metadata = {
    ...this.metadata,
    ...metadataUpdates,
    updatedAt: new Date()
  };
  return await this.save();
};

/**
 * Metodo de instancia: establecer area academica
 * @param {string} area - Area academica
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.setAcademicArea = async function (area) {
  if (!this.metadata) {
    this.metadata = {};
  }
  this.metadata.area = area;
  this.metadata.academicMode = true;
  
  if (!this.tags.includes('academico')) {
    this.tags.push('academico');
  }
  if (area && !this.tags.includes(area)) {
    this.tags.push(area);
  }
  
  return await this.save();
};

/**
 * Metodo de instancia: archivar conversacion
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.archive = async function () {
  this.isArchived = true;
  return await this.save();
};

/**
 * Metodo de instancia: desarchivar conversacion
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.unarchive = async function () {
  this.isArchived = false;
  return await this.save();
};

/**
 * Metodo de instancia: fijar conversacion
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.pin = async function () {
  this.isPinned = true;
  return await this.save();
};

/**
 * Metodo de instancia: desfijar conversacion
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.unpin = async function () {
  this.isPinned = false;
  return await this.save();
};

/**
 * Metodo de instancia: agregar tag
 * @param {string} tag - Tag a agregar
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.addTag = async function (tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return await this.save();
  }
  return this;
};

/**
 * Metodo de instancia: eliminar tag
 * @param {string} tag - Tag a eliminar
 * @returns {Promise<Object>} - Conversacion actualizada
 */
conversationSchema.methods.removeTag = async function (tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return await this.save();
};

/**
 * Metodo estatico: obtener conversaciones por usuario
 * @param {string} userId - ID del usuario
 * @param {Object} options - Opciones de filtrado y paginacion
 * @returns {Promise<Array>} - Lista de conversaciones
 */
conversationSchema.statics.findByUserId = function (userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    isArchived = false,
    tags = null,
    sortBy = 'lastMessageAt',
    sortOrder = -1,
  } = options;
  
  const query = { userId, isArchived };
  
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }
  
  return this.find(query)
    .sort({ isPinned: -1, [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('messages');
};

/**
 * Metodo estatico: buscar conversaciones por tag
 * @param {string} userId - ID del usuario
 * @param {string} tag - Tag a buscar
 * @returns {Promise<Array>} - Lista de conversaciones
 */
conversationSchema.statics.findByTag = function (userId, tag) {
  return this.find({ userId, tags: tag }).sort({ lastMessageAt: -1 });
};

/**
 * Metodo estatico: buscar conversaciones academicas
 * @param {string} userId - ID del usuario
 * @param {string} area - Area academica (opcional)
 * @returns {Promise<Array>} - Lista de conversaciones academicas
 */
conversationSchema.statics.findAcademic = function (userId, area = null) {
  const query = { 
    userId, 
    $or: [
      { 'metadata.academicMode': true },
      { tags: 'academico' }
    ]
  };
  
  if (area) {
    query['metadata.area'] = area;
  }
  
  return this.find(query).sort({ lastMessageAt: -1 });
};

/**
 * Metodo estatico: contar conversaciones por usuario
 * @param {string} userId - ID del usuario
 * @param {boolean} isArchived - Filtrar archivadas
 * @returns {Promise<number>} - Cantidad de conversaciones
 */
conversationSchema.statics.countByUserId = function (userId, isArchived = false) {
  return this.countDocuments({ userId, isArchived });
};

/**
 * Middleware pre-remove: limpiar mensajes relacionados
 */
conversationSchema.pre('remove', async function (next) {
  try {
    await this.model('Message').deleteMany({ conversationId: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Middleware pre-save: actualizar messageCount
 */
conversationSchema.pre('save', function (next) {
  if (this.isModified('messages')) {
    this.messageCount = this.messages.length;
  }
  next();
});

/**
 * Middleware pre-save: inicializar metadata si no existe
 */
conversationSchema.pre('save', function (next) {
  if (!this.metadata) {
    this.metadata = {};
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;