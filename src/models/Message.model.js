// src/models/Message.model.js

const mongoose = require('mongoose');
const { MESSAGE_TYPES, MESSAGE_ROLES, CONTENT_LIMITS } = require('../config/constants');

/**
 * Schema de Mensaje
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'El ID de conversacion es requerido'],
      index: true,
    },
    
    role: {
      type: String,
      enum: Object.values(MESSAGE_ROLES),
      required: [true, 'El rol del mensaje es requerido'],
    },
    
    content: {
      type: String,
      required: [true, 'El contenido del mensaje es requerido'],
      maxlength: [CONTENT_LIMITS.TEXT_MAX_LENGTH, 'El contenido no puede exceder 30000 caracteres'],
    },
    
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPES),
      default: MESSAGE_TYPES.TEXT,
    },
    
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'audio', 'pdf', 'other'],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          default: 0,
        },
        mimeType: {
          type: String,
          default: null,
        },
      },
    ],
    
    tokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    metadata: {
      model: {
        type: String,
        default: null,
      },
      temperature: {
        type: Number,
        default: null,
      },
      maxTokens: {
        type: Number,
        default: null,
      },
      finishReason: {
        type: String,
        default: null,
      },
      processingTime: {
        type: Number,
        default: 0,
      },
    },
    
    isEdited: {
      type: Boolean,
      default: false,
    },
    
    editedAt: {
      type: Date,
      default: null,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
    },
    
    deletedAt: {
      type: Date,
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
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, role: 1 });
messageSchema.index({ type: 1 });

/**
 * Virtual para verificar si tiene adjuntos
 */
messageSchema.virtual('hasAttachments').get(function () {
  return this.attachments && this.attachments.length > 0;
});

/**
 * Virtual para contar adjuntos
 */
messageSchema.virtual('attachmentsCount').get(function () {
  return this.attachments ? this.attachments.length : 0;
});

/**
 * Metodo de instancia: agregar adjunto
 * @param {Object} attachment - Datos del adjunto
 * @returns {Promise<Object>} - Mensaje actualizado
 */
messageSchema.methods.addAttachment = async function (attachment) {
  if (this.attachments.length >= CONTENT_LIMITS.MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new Error(`No se pueden agregar mas de ${CONTENT_LIMITS.MAX_ATTACHMENTS_PER_MESSAGE} adjuntos`);
  }
  
  this.attachments.push(attachment);
  return await this.save();
};

/**
 * Metodo de instancia: eliminar adjunto
 * @param {string} attachmentId - ID del adjunto
 * @returns {Promise<Object>} - Mensaje actualizado
 */
messageSchema.methods.removeAttachment = async function (attachmentId) {
  this.attachments = this.attachments.filter(att => att._id.toString() !== attachmentId.toString());
  return await this.save();
};

/**
 * Metodo de instancia: editar contenido
 * @param {string} newContent - Nuevo contenido
 * @returns {Promise<Object>} - Mensaje actualizado
 */
messageSchema.methods.editContent = async function (newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = Date.now();
  return await this.save();
};

/**
 * Metodo de instancia: marcar como eliminado (soft delete)
 * @returns {Promise<Object>} - Mensaje actualizado
 */
messageSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  return await this.save();
};

/**
 * Metodo de instancia: restaurar mensaje eliminado
 * @returns {Promise<Object>} - Mensaje actualizado
 */
messageSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  return await this.save();
};

/**
 * Metodo de instancia: actualizar metadata
 * @param {Object} metadata - Metadata a actualizar
 * @returns {Promise<Object>} - Mensaje actualizado
 */
messageSchema.methods.updateMetadata = async function (metadata) {
  this.metadata = { ...this.metadata, ...metadata };
  return await this.save();
};

/**
 * Metodo estatico: obtener mensajes por conversacion
 * @param {string} conversationId - ID de la conversacion
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Array>} - Lista de mensajes
 */
messageSchema.statics.findByConversationId = function (conversationId, options = {}) {
  const {
    page = 1,
    limit = 50,
    includeDeleted = false,
    sortOrder = 1,
  } = options;
  
  const query = { conversationId };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  return this.find(query)
    .sort({ createdAt: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Metodo estatico: obtener ultimo mensaje de una conversacion
 * @param {string} conversationId - ID de la conversacion
 * @returns {Promise<Object>} - Ultimo mensaje
 */
messageSchema.statics.getLastMessage = function (conversationId) {
  return this.findOne({ conversationId, isDeleted: false })
    .sort({ createdAt: -1 });
};

/**
 * Metodo estatico: contar mensajes por conversacion
 * @param {string} conversationId - ID de la conversacion
 * @param {boolean} includeDeleted - Incluir mensajes eliminados
 * @returns {Promise<number>} - Cantidad de mensajes
 */
messageSchema.statics.countByConversationId = function (conversationId, includeDeleted = false) {
  const query = { conversationId };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  return this.countDocuments(query);
};

/**
 * Metodo estatico: obtener total de tokens usados por conversacion
 * @param {string} conversationId - ID de la conversacion
 * @returns {Promise<number>} - Total de tokens
 */
messageSchema.statics.getTotalTokens = async function (conversationId) {
  const result = await this.aggregate([
    { $match: { conversationId: mongoose.Types.ObjectId(conversationId), isDeleted: false } },
    { $group: { _id: null, total: { $sum: '$tokens' } } },
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

/**
 * Metodo estatico: buscar mensajes por tipo
 * @param {string} conversationId - ID de la conversacion
 * @param {string} type - Tipo de mensaje
 * @returns {Promise<Array>} - Lista de mensajes
 */
messageSchema.statics.findByType = function (conversationId, type) {
  return this.find({ conversationId, type, isDeleted: false })
    .sort({ createdAt: -1 });
};

/**
 * Metodo estatico: buscar mensajes por rol
 * @param {string} conversationId - ID de la conversacion
 * @param {string} role - Rol del mensaje
 * @returns {Promise<Array>} - Lista de mensajes
 */
messageSchema.statics.findByRole = function (conversationId, role) {
  return this.find({ conversationId, role, isDeleted: false })
    .sort({ createdAt: -1 });
};

/**
 * Middleware pre-save: validar numero de adjuntos
 */
messageSchema.pre('save', function (next) {
  if (this.attachments && this.attachments.length > CONTENT_LIMITS.MAX_ATTACHMENTS_PER_MESSAGE) {
    return next(new Error(`No se pueden tener mas de ${CONTENT_LIMITS.MAX_ATTACHMENTS_PER_MESSAGE} adjuntos`));
  }
  next();
});

/**
 * Middleware post-save: actualizar conversacion padre
 */
messageSchema.post('save', async function (doc) {
  try {
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(
      doc.conversationId,
      { 
        lastMessageAt: Date.now(),
        $inc: { 'tokenUsage.total': doc.tokens },
      }
    );
  } catch (error) {
    console.error('Error al actualizar conversacion:', error);
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;