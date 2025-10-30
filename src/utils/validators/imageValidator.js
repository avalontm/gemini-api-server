// src/utils/validators/imageValidator.js

const sharp = require('sharp');
const { MIME_TYPES, FILE_SIZE_LIMITS } = require('../../config/constants');

/**
 * Validadores para imagenes
 */

/**
 * Validar dimensiones de imagen
 * @param {number} width - Ancho
 * @param {number} height - Alto
 * @param {Object} limits - Limites {minWidth, maxWidth, minHeight, maxHeight}
 * @returns {Object} - Resultado de validacion
 */
const validateImageDimensions = (width, height, limits = {}) => {
  const errors = [];
  
  const {
    minWidth = 1,
    maxWidth = 10000,
    minHeight = 1,
    maxHeight = 10000,
  } = limits;
  
  if (width < minWidth) {
    errors.push(`El ancho de la imagen debe ser al menos ${minWidth}px`);
  }
  
  if (width > maxWidth) {
    errors.push(`El ancho de la imagen no puede exceder ${maxWidth}px`);
  }
  
  if (height < minHeight) {
    errors.push(`El alto de la imagen debe ser al menos ${minHeight}px`);
  }
  
  if (height > maxHeight) {
    errors.push(`El alto de la imagen no puede exceder ${maxHeight}px`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    dimensions: { width, height },
  };
};

/**
 * Validar aspect ratio de imagen
 * @param {number} width - Ancho
 * @param {number} height - Alto
 * @param {Array<number>} allowedRatios - Ratios permitidos [ej: [1, 1.5, 1.77]]
 * @param {number} tolerance - Tolerancia (por defecto 0.1)
 * @returns {Object} - Resultado de validacion
 */
const validateAspectRatio = (width, height, allowedRatios = [], tolerance = 0.1) => {
  const errors = [];
  
  if (allowedRatios.length === 0) {
    return { isValid: true, errors: [], ratio: width / height };
  }
  
  const ratio = width / height;
  const isValid = allowedRatios.some(allowedRatio => {
    return Math.abs(ratio - allowedRatio) <= tolerance;
  });
  
  if (!isValid) {
    errors.push(`El aspect ratio de la imagen no es valido. Ratios permitidos: ${allowedRatios.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    ratio,
  };
};

/**
 * Obtener metadata de imagen
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Metadata de la imagen
 */
const getImageMetadata = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    
    return {
      success: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        size: metadata.size,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Validar imagen completa
 * @param {string} filePath - Ruta del archivo
 * @param {Object} options - Opciones de validacion
 * @returns {Promise<Object>} - Resultado de validacion
 */
const validateImage = async (filePath, options = {}) => {
  const errors = [];
  
  const {
    minWidth = 1,
    maxWidth = 10000,
    minHeight = 1,
    maxHeight = 10000,
    allowedFormats = ['jpeg', 'png', 'webp', 'gif'],
    maxFileSize = FILE_SIZE_LIMITS.IMAGE,
    allowedRatios = [],
  } = options;
  
  try {
    // Obtener metadata
    const metadataResult = await getImageMetadata(filePath);
    
    if (!metadataResult.success) {
      errors.push('No se pudo leer la imagen');
      return { isValid: false, errors };
    }
    
    const { metadata } = metadataResult;
    
    // Validar formato
    if (!allowedFormats.includes(metadata.format)) {
      errors.push(`Formato de imagen no permitido: ${metadata.format}`);
    }
    
    // Validar dimensiones
    const dimensionsValidation = validateImageDimensions(
      metadata.width,
      metadata.height,
      { minWidth, maxWidth, minHeight, maxHeight }
    );
    
    if (!dimensionsValidation.isValid) {
      errors.push(...dimensionsValidation.errors);
    }
    
    // Validar aspect ratio si se especifica
    if (allowedRatios.length > 0) {
      const ratioValidation = validateAspectRatio(
        metadata.width,
        metadata.height,
        allowedRatios
      );
      
      if (!ratioValidation.isValid) {
        errors.push(...ratioValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      metadata,
    };
  } catch (error) {
    errors.push(`Error al validar imagen: ${error.message}`);
    return { isValid: false, errors };
  }
};

/**
 * Validar si la imagen es corrupta
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Resultado de validacion
 */
const validateImageIntegrity = async (filePath) => {
  const errors = [];
  
  try {
    // Intentar procesar la imagen
    await sharp(filePath).toBuffer();
    
    return {
      isValid: true,
      errors: [],
    };
  } catch (error) {
    errors.push('La imagen esta corrupta o no se puede procesar');
    return {
      isValid: false,
      errors,
      error: error.message,
    };
  }
};

/**
 * Validar multiples imagenes
 * @param {Array<string>} filePaths - Array de rutas de archivos
 * @param {Object} options - Opciones de validacion
 * @returns {Promise<Object>} - Resultado de validacion
 */
const validateMultipleImages = async (filePaths, options = {}) => {
  const errors = [];
  const results = [];
  
  if (!filePaths || filePaths.length === 0) {
    errors.push('No se proporcionaron imagenes');
    return { isValid: false, errors };
  }
  
  const { maxImages = 5 } = options;
  
  if (filePaths.length > maxImages) {
    errors.push(`Solo se permiten hasta ${maxImages} imagenes`);
  }
  
  // Validar cada imagen
  for (let i = 0; i < filePaths.length; i++) {
    const validation = await validateImage(filePaths[i], options);
    
    results.push({
      index: i,
      filePath: filePaths[i],
      isValid: validation.isValid,
      errors: validation.errors,
      metadata: validation.metadata,
    });
    
    if (!validation.isValid) {
      errors.push(`Imagen ${i + 1}: ${validation.errors.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    results,
  };
};

/**
 * Calcular ratio de compresion recomendado
 * @param {number} fileSize - Tamaño del archivo en bytes
 * @param {number} targetSize - Tamaño objetivo en bytes
 * @returns {number} - Quality ratio (0-100)
 */
const calculateCompressionRatio = (fileSize, targetSize) => {
  if (fileSize <= targetSize) {
    return 100;
  }
  
  const ratio = targetSize / fileSize;
  const quality = Math.max(10, Math.min(100, Math.floor(ratio * 100)));
  
  return quality;
};

/**
 * Validar que la imagen no contenga contenido inapropiado (placeholder)
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Resultado de validacion
 */
const validateImageContent = async (filePath) => {
  // Nota: Esta es una funcion placeholder
  // En produccion, aqui se integraria un servicio de moderacion de contenido
  // como Google Cloud Vision API, AWS Rekognition, etc.
  
  return {
    isValid: true,
    errors: [],
    safe: true,
    categories: [],
  };
};

/**
 * Obtener informacion resumida de imagen
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Informacion de la imagen
 */
const getImageInfo = async (filePath) => {
  try {
    const metadataResult = await getImageMetadata(filePath);
    
    if (!metadataResult.success) {
      return null;
    }
    
    const { metadata } = metadataResult;
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      aspectRatio: (metadata.width / metadata.height).toFixed(2),
      megapixels: ((metadata.width * metadata.height) / 1000000).toFixed(2),
      hasAlpha: metadata.hasAlpha,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Validar formato de imagen desde buffer
 * @param {Buffer} buffer - Buffer de la imagen
 * @returns {Promise<Object>} - Resultado de validacion
 */
const validateImageBuffer = async (buffer) => {
  const errors = [];
  
  try {
    const metadata = await sharp(buffer).metadata();
    
    const allowedFormats = ['jpeg', 'png', 'webp', 'gif'];
    
    if (!allowedFormats.includes(metadata.format)) {
      errors.push(`Formato no permitido: ${metadata.format}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      },
    };
  } catch (error) {
    errors.push('Buffer de imagen invalido');
    return { isValid: false, errors };
  }
};

module.exports = {
  validateImageDimensions,
  validateAspectRatio,
  validateImage,
  validateImageIntegrity,
  validateMultipleImages,
  validateImageContent,
  getImageMetadata,
  getImageInfo,
  calculateCompressionRatio,
  validateImageBuffer,
};