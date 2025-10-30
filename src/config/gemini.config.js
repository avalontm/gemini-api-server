// src/config/gemini.config.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Configuracion de la API de Google Gemini
 */
const geminiConfig = {
  // API Key de Gemini
  apiKey: process.env.GEMINI_API_KEY,
  
  // Modelo a utilizar
  model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  
  // Configuracion de generacion
  generationConfig: {
    // Temperatura: controla la aleatoriedad (0.0 - 2.0)
    // Valores bajos: mas deterministico y conservador
    // Valores altos: mas creativo y aleatorio
    temperature: 0.9,
    
    // Top P: controla la diversidad mediante nucleus sampling (0.0 - 1.0)
    topP: 0.95,
    
    // Top K: limita las opciones de tokens a considerar
    topK: 40,
    
    // Numero maximo de tokens a generar
    maxOutputTokens: 8192,
    
    // Secuencias de parada (opcional)
    stopSequences: [],
  },
  
  // Configuracion de seguridad
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ],
  
  // Configuracion para diferentes tipos de contenido
  contentTypes: {
    text: {
      temperature: 0.9,
      maxOutputTokens: 8192,
    },
    image: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
    voice: {
      temperature: 0.8,
      maxOutputTokens: 4096,
    },
    multimodal: {
      temperature: 0.85,
      maxOutputTokens: 8192,
    },
    pdf: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  },
  
  // Limites de uso
  limits: {
    // Limite de tokens por solicitud
    maxTokensPerRequest: 30000,
    
    // Limite de caracteres por entrada de texto
    maxTextLength: 30000,
    
    // Limite de imagenes por solicitud
    maxImagesPerRequest: 16,
    
    // Limite de archivos de audio por solicitud
    maxAudioPerRequest: 1,
    
    // Limite de PDFs por solicitud
    maxPDFsPerRequest: 1,
  },
  
  // Configuracion de streaming
  streaming: {
    enabled: true,
    chunkSize: 1024,
  },
};

/**
 * Inicializar cliente de Gemini
 * @returns {GoogleGenerativeAI}
 */
const initializeGeminiClient = () => {
  if (!geminiConfig.apiKey) {
    throw new Error('GEMINI_API_KEY no esta configurada en las variables de entorno');
  }
  
  return new GoogleGenerativeAI(geminiConfig.apiKey);
};

/**
 * Obtener modelo de Gemini
 * @param {GoogleGenerativeAI} client - Cliente de Gemini
 * @param {string} contentType - Tipo de contenido (text, image, voice, multimodal, pdf)
 * @returns {Object} - Modelo de Gemini configurado
 */
const getGeminiModel = (client, contentType = 'text') => {
  const config = geminiConfig.contentTypes[contentType] || geminiConfig.contentTypes.text;
  
  return client.getGenerativeModel({
    model: geminiConfig.model,
    generationConfig: {
      ...geminiConfig.generationConfig,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    },
    safetySettings: geminiConfig.safetySettings,
  });
};

/**
 * Validar configuracion de Gemini
 * @returns {Object} - Resultado de validacion
 */
const validateGeminiConfig = () => {
  const errors = [];
  
  if (!geminiConfig.apiKey) {
    errors.push('GEMINI_API_KEY no esta configurada');
  }
  
  if (!geminiConfig.model) {
    errors.push('GEMINI_MODEL no esta configurado');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  geminiConfig,
  initializeGeminiClient,
  getGeminiModel,
  validateGeminiConfig,
};