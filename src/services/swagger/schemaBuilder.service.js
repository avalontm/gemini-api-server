// src/services/swagger/schemaBuilder.service.js

class SchemaBuilderService {
  /**
   * Construye todos los schemas de la API
   * @returns {Object} - Schemas OpenAPI
   */
  buildSchemas() {
    return {
      User: this.buildUserSchema(),
      Conversation: this.buildConversationSchema(),
      Message: this.buildMessageSchema(),
      LoginRequest: this.buildLoginRequestSchema(),
      LoginResponse: this.buildLoginResponseSchema(),
      RegisterRequest: this.buildRegisterRequestSchema(),
      RegisterResponse: this.buildRegisterResponseSchema(),
      TextRequest: this.buildTextRequestSchema(),
      TextResponse: this.buildTextResponseSchema(),
      ImageRequest: this.buildImageRequestSchema(),
      ImageResponse: this.buildImageResponseSchema(),
      VoiceRequest: this.buildVoiceRequestSchema(),
      VoiceResponse: this.buildVoiceResponseSchema(),
      MultimodalRequest: this.buildMultimodalRequestSchema(),
      MultimodalResponse: this.buildMultimodalResponseSchema(),
      PDFRequest: this.buildPDFRequestSchema(),
      PDFResponse: this.buildPDFResponseSchema(),
      ConversationCreateRequest: this.buildConversationCreateRequestSchema(),
      ConversationResponse: this.buildConversationResponseSchema(),
      ConversationListResponse: this.buildConversationListResponseSchema(),
      ErrorResponse: this.buildErrorResponseSchema(),
      SuccessResponse: this.buildSuccessResponseSchema(),
      TokenInfo: this.buildTokenInfoSchema(),
      Attachment: this.buildAttachmentSchema()
    };
  }

  /**
   * Schema de Usuario
   */
  buildUserSchema() {
    return {
      type: 'object',
      properties: {
        _id: {
          type: 'string',
          description: 'ID del usuario',
          example: '507f1f77bcf86cd799439011'
        },
        username: {
          type: 'string',
          description: 'Nombre de usuario',
          example: 'johndoe'
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email del usuario',
          example: 'john@example.com'
        },
        avatar: {
          type: 'string',
          description: 'URL del avatar',
          example: 'https://example.com/avatar.jpg'
        },
        role: {
          type: 'string',
          enum: ['user', 'admin'],
          description: 'Rol del usuario',
          example: 'user'
        },
        preferences: {
          type: 'object',
          properties: {
            theme: {
              type: 'string',
              enum: ['light', 'dark'],
              example: 'dark'
            },
            language: {
              type: 'string',
              example: 'es'
            }
          }
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Fecha de creacion'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Fecha de actualizacion'
        }
      },
      required: ['username', 'email']
    };
  }

  /**
   * Schema de Conversacion
   */
  buildConversationSchema() {
    return {
      type: 'object',
      properties: {
        _id: {
          type: 'string',
          description: 'ID de la conversacion',
          example: '507f1f77bcf86cd799439012'
        },
        userId: {
          type: 'string',
          description: 'ID del usuario propietario',
          example: '507f1f77bcf86cd799439011'
        },
        title: {
          type: 'string',
          description: 'Titulo de la conversacion',
          example: 'Consulta sobre JavaScript'
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Tags de la conversacion',
          example: ['javascript', 'programming']
        },
        messages: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'IDs de mensajes',
          example: ['507f1f77bcf86cd799439013']
        },
        tokenUsage: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Tokens totales utilizados',
              example: 1500
            },
            estimatedCost: {
              type: 'number',
              description: 'Costo estimado en USD',
              example: 0.0015
            }
          }
        },
        createdAt: {
          type: 'string',
          format: 'date-time'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time'
        }
      },
      required: ['userId', 'title']
    };
  }

  /**
   * Schema de Mensaje
   */
  buildMessageSchema() {
    return {
      type: 'object',
      properties: {
        _id: {
          type: 'string',
          description: 'ID del mensaje',
          example: '507f1f77bcf86cd799439013'
        },
        conversationId: {
          type: 'string',
          description: 'ID de la conversacion',
          example: '507f1f77bcf86cd799439012'
        },
        role: {
          type: 'string',
          enum: ['user', 'assistant'],
          description: 'Rol del mensaje',
          example: 'user'
        },
        content: {
          type: 'string',
          description: 'Contenido del mensaje',
          example: 'Que es JavaScript?'
        },
        type: {
          type: 'string',
          enum: ['text', 'image', 'voice', 'multimodal', 'pdf'],
          description: 'Tipo de mensaje',
          example: 'text'
        },
        attachments: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Attachment'
          }
        },
        tokens: {
          type: 'number',
          description: 'Tokens utilizados',
          example: 50
        },
        createdAt: {
          type: 'string',
          format: 'date-time'
        }
      },
      required: ['conversationId', 'role', 'content', 'type']
    };
  }

  /**
   * Schema de Attachment
   */
  buildAttachmentSchema() {
    return {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['image', 'audio', 'pdf'],
          description: 'Tipo de adjunto',
          example: 'image'
        },
        url: {
          type: 'string',
          description: 'URL del archivo',
          example: '/uploads/images/file_123.jpg'
        },
        name: {
          type: 'string',
          description: 'Nombre del archivo',
          example: 'image.jpg'
        }
      }
    };
  }

  /**
   * Schema de Login Request
   */
  buildLoginRequestSchema() {
    return {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Email del usuario',
          example: 'john@example.com'
        },
        password: {
          type: 'string',
          format: 'password',
          description: 'Password del usuario',
          example: 'MySecurePass123!'
        }
      },
      required: ['email', 'password']
    };
  }

  /**
   * Schema de Login Response
   */
  buildLoginResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        message: {
          type: 'string',
          example: 'Login exitoso'
        },
        token: {
          type: 'string',
          description: 'JWT token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          $ref: '#/components/schemas/User'
        }
      }
    };
  }

  /**
   * Schema de Register Request
   */
  buildRegisterRequestSchema() {
    return {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Nombre de usuario',
          example: 'johndoe'
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email del usuario',
          example: 'john@example.com'
        },
        password: {
          type: 'string',
          format: 'password',
          description: 'Password (minimo 8 caracteres)',
          example: 'MySecurePass123!'
        }
      },
      required: ['username', 'email', 'password']
    };
  }

  /**
   * Schema de Register Response
   */
  buildRegisterResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        message: {
          type: 'string',
          example: 'Usuario registrado exitosamente'
        },
        token: {
          type: 'string',
          description: 'JWT token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          $ref: '#/components/schemas/User'
        }
      }
    };
  }

  /**
   * Schema de Text Request
   */
  buildTextRequestSchema() {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Texto del prompt',
          example: 'Explicame que es Node.js'
        },
        conversationId: {
          type: 'string',
          description: 'ID de conversacion existente (opcional)',
          example: '507f1f77bcf86cd799439012'
        },
        config: {
          type: 'object',
          properties: {
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              example: 0.7
            },
            maxTokens: {
              type: 'number',
              example: 2048
            }
          }
        }
      },
      required: ['prompt']
    };
  }

  /**
   * Schema de Text Response
   */
  buildTextResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        response: {
          type: 'string',
          description: 'Respuesta generada',
          example: 'Node.js es un entorno de ejecucion...'
        },
        conversationId: {
          type: 'string',
          example: '507f1f77bcf86cd799439012'
        },
        messageId: {
          type: 'string',
          example: '507f1f77bcf86cd799439013'
        },
        tokens: {
          $ref: '#/components/schemas/TokenInfo'
        }
      }
    };
  }

  /**
   * Schema de Image Request
   */
  buildImageRequestSchema() {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Pregunta sobre la imagen',
          example: 'Que objetos ves en esta imagen?'
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen'
        },
        conversationId: {
          type: 'string',
          description: 'ID de conversacion existente (opcional)',
          example: '507f1f77bcf86cd799439012'
        }
      },
      required: ['prompt', 'image']
    };
  }

  /**
   * Schema de Image Response
   */
  buildImageResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        response: {
          type: 'string',
          description: 'Analisis de la imagen',
          example: 'En la imagen veo un gato...'
        },
        conversationId: {
          type: 'string',
          example: '507f1f77bcf86cd799439012'
        },
        imageUrl: {
          type: 'string',
          example: '/uploads/images/image_123.jpg'
        },
        tokens: {
          $ref: '#/components/schemas/TokenInfo'
        }
      }
    };
  }

  /**
   * Schema de Voice Request
   */
  buildVoiceRequestSchema() {
    return {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de audio'
        },
        conversationId: {
          type: 'string',
          description: 'ID de conversacion existente (opcional)',
          example: '507f1f77bcf86cd799439012'
        }
      },
      required: ['audio']
    };
  }

  /**
   * Schema de Voice Response
   */
  buildVoiceResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        transcription: {
          type: 'string',
          description: 'Transcripcion del audio',
          example: 'Hola, como estas?'
        },
        response: {
          type: 'string',
          description: 'Respuesta generada',
          example: 'Estoy bien, gracias por preguntar'
        },
        conversationId: {
          type: 'string',
          example: '507f1f77bcf86cd799439012'
        },
        tokens: {
          $ref: '#/components/schemas/TokenInfo'
        }
      }
    };
  }

  /**
   * Schema de Multimodal Request
   */
  buildMultimodalRequestSchema() {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Texto del prompt',
          example: 'Analiza estas imagenes'
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Array de archivos'
        },
        conversationId: {
          type: 'string',
          description: 'ID de conversacion existente (opcional)',
          example: '507f1f77bcf86cd799439012'
        }
      },
      required: ['prompt', 'files']
    };
  }

  /**
   * Schema de Multimodal Response
   */
  buildMultimodalResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        response: {
          type: 'string',
          description: 'Respuesta generada',
          example: 'Analizando las imagenes...'
        },
        conversationId: {
          type: 'string',
          example: '507f1f77bcf86cd799439012'
        },
        tokens: {
          $ref: '#/components/schemas/TokenInfo'
        }
      }
    };
  }

  /**
   * Schema de PDF Request
   */
  buildPDFRequestSchema() {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Pregunta sobre el PDF',
          example: 'Resume el contenido de este documento'
        },
        pdf: {
          type: 'string',
          format: 'binary',
          description: 'Archivo PDF'
        },
        conversationId: {
          type: 'string',
          description: 'ID de conversacion existente (opcional)',
          example: '507f1f77bcf86cd799439012'
        }
      },
      required: ['prompt', 'pdf']
    };
  }

  /**
   * Schema de PDF Response
   */
  buildPDFResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        response: {
          type: 'string',
          description: 'Analisis del PDF',
          example: 'El documento trata sobre...'
        },
        conversationId: {
          type: 'string',
          example: '507f1f77bcf86cd799439012'
        },
        tokens: {
          $ref: '#/components/schemas/TokenInfo'
        }
      }
    };
  }

  /**
   * Schema de Conversation Create Request
   */
  buildConversationCreateRequestSchema() {
    return {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titulo de la conversacion',
          example: 'Nueva conversacion'
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Tags opcionales',
          example: ['javascript', 'tutorial']
        }
      },
      required: ['title']
    };
  }

  /**
   * Schema de Conversation Response
   */
  buildConversationResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        conversation: {
          $ref: '#/components/schemas/Conversation'
        }
      }
    };
  }

  /**
   * Schema de Conversation List Response
   */
  buildConversationListResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        conversations: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Conversation'
          }
        },
        total: {
          type: 'number',
          description: 'Total de conversaciones',
          example: 10
        }
      }
    };
  }

  /**
   * Schema de Token Info
   */
  buildTokenInfoSchema() {
    return {
      type: 'object',
      properties: {
        prompt: {
          type: 'number',
          description: 'Tokens del prompt',
          example: 50
        },
        completion: {
          type: 'number',
          description: 'Tokens de la respuesta',
          example: 200
        },
        total: {
          type: 'number',
          description: 'Tokens totales',
          example: 250
        }
      }
    };
  }

  /**
   * Schema de Error Response
   */
  buildErrorResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: false
        },
        message: {
          type: 'string',
          description: 'Mensaje de error',
          example: 'Error procesando solicitud'
        },
        error: {
          type: 'string',
          description: 'Detalle del error',
          example: 'Invalid request parameters'
        }
      }
    };
  }

  /**
   * Schema de Success Response
   */
  buildSuccessResponseSchema() {
    return {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        message: {
          type: 'string',
          description: 'Mensaje de exito',
          example: 'Operacion exitosa'
        }
      }
    };
  }
}

module.exports = new SchemaBuilderService();