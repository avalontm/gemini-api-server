// src/services/processing/imageProcessor.service.js

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } = require('../../config/constants');

class ImageProcessorService {
  /**
   * Redimensiona una imagen manteniendo aspect ratio
   * @param {string} inputPath - Ruta de la imagen original
   * @param {Object} options - Opciones de redimensionamiento
   * @param {number} options.width - Ancho maximo
   * @param {number} options.height - Alto maximo
   * @param {string} options.outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Informacion de la imagen procesada
   */
  async resize(inputPath, options = {}) {
    try {
      const { width = 1920, height = 1080, outputPath } = options;

      await this.validateImageFile(inputPath);

      const output = outputPath || this.generateOutputPath(inputPath, 'resized');

      const metadata = await sharp(inputPath).metadata();

      const resized = await sharp(inputPath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(output);

      return {
        path: output,
        originalSize: {
          width: metadata.width,
          height: metadata.height
        },
        newSize: {
          width: resized.width,
          height: resized.height
        },
        format: resized.format,
        size: resized.size
      };
    } catch (error) {
      throw new Error(`Error redimensionando imagen: ${error.message}`);
    }
  }

  /**
   * Comprime una imagen reduciendo calidad
   * @param {string} inputPath - Ruta de la imagen original
   * @param {Object} options - Opciones de compresion
   * @param {number} options.quality - Calidad (1-100)
   * @param {string} options.outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Informacion de la imagen comprimida
   */
  async compress(inputPath, options = {}) {
    try {
      const { quality = 80, outputPath } = options;

      await this.validateImageFile(inputPath);

      const output = outputPath || this.generateOutputPath(inputPath, 'compressed');

      const metadata = await sharp(inputPath).metadata();
      const originalStats = await fs.stat(inputPath);

      let compressed;

      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        compressed = await sharp(inputPath)
          .jpeg({ quality })
          .toFile(output);
      } else if (metadata.format === 'png') {
        compressed = await sharp(inputPath)
          .png({ quality })
          .toFile(output);
      } else if (metadata.format === 'webp') {
        compressed = await sharp(inputPath)
          .webp({ quality })
          .toFile(output);
      } else {
        compressed = await sharp(inputPath)
          .jpeg({ quality })
          .toFile(output);
      }

      const compressionRatio = ((originalStats.size - compressed.size) / originalStats.size * 100).toFixed(2);

      return {
        path: output,
        originalSize: originalStats.size,
        compressedSize: compressed.size,
        compressionRatio: `${compressionRatio}%`,
        format: compressed.format,
        quality
      };
    } catch (error) {
      throw new Error(`Error comprimiendo imagen: ${error.message}`);
    }
  }

  /**
   * Convierte imagen a formato especifico
   * @param {string} inputPath - Ruta de la imagen original
   * @param {Object} options - Opciones de conversion
   * @param {string} options.format - Formato destino (jpeg, png, webp, gif)
   * @param {number} options.quality - Calidad (opcional)
   * @param {string} options.outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Informacion de la imagen convertida
   */
  async convert(inputPath, options = {}) {
    try {
      const { format = 'jpeg', quality = 90, outputPath } = options;

      await this.validateImageFile(inputPath);

      const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'avif'];
      if (!supportedFormats.includes(format)) {
        throw new Error(`Formato no soportado. Formatos disponibles: ${supportedFormats.join(', ')}`);
      }

      const output = outputPath || this.generateOutputPath(inputPath, `converted.${format}`);

      let converted;
      const sharpInstance = sharp(inputPath);

      switch (format) {
        case 'jpeg':
          converted = await sharpInstance.jpeg({ quality }).toFile(output);
          break;
        case 'png':
          converted = await sharpInstance.png({ quality }).toFile(output);
          break;
        case 'webp':
          converted = await sharpInstance.webp({ quality }).toFile(output);
          break;
        case 'gif':
          converted = await sharpInstance.gif().toFile(output);
          break;
        case 'avif':
          converted = await sharpInstance.avif({ quality }).toFile(output);
          break;
        default:
          converted = await sharpInstance.jpeg({ quality }).toFile(output);
      }

      return {
        path: output,
        format: converted.format,
        size: converted.size,
        width: converted.width,
        height: converted.height
      };
    } catch (error) {
      throw new Error(`Error convirtiendo imagen: ${error.message}`);
    }
  }

  /**
   * Recorta una imagen
   * @param {string} inputPath - Ruta de la imagen original
   * @param {Object} options - Opciones de recorte
   * @param {number} options.left - Posicion X inicial
   * @param {number} options.top - Posicion Y inicial
   * @param {number} options.width - Ancho del recorte
   * @param {number} options.height - Alto del recorte
   * @param {string} options.outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Informacion de la imagen recortada
   */
  async crop(inputPath, options = {}) {
    try {
      const { left = 0, top = 0, width, height, outputPath } = options;

      if (!width || !height) {
        throw new Error('width y height son requeridos para recortar');
      }

      await this.validateImageFile(inputPath);

      const output = outputPath || this.generateOutputPath(inputPath, 'cropped');

      const cropped = await sharp(inputPath)
        .extract({ left, top, width, height })
        .toFile(output);

      return {
        path: output,
        size: {
          width: cropped.width,
          height: cropped.height
        },
        format: cropped.format,
        fileSize: cropped.size
      };
    } catch (error) {
      throw new Error(`Error recortando imagen: ${error.message}`);
    }
  }

  /**
   * Rota una imagen
   * @param {string} inputPath - Ruta de la imagen original
   * @param {Object} options - Opciones de rotacion
   * @param {number} options.angle - Angulo de rotacion (90, 180, 270)
   * @param {string} options.outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Informacion de la imagen rotada
   */
  async rotate(inputPath, options = {}) {
    try {
      const { angle = 90, outputPath } = options;

      const validAngles = [90, 180, 270];
      if (!validAngles.includes(angle)) {
        throw new Error(`Angulo no valido. Angulos permitidos: ${validAngles.join(', ')}`);
      }

      await this.validateImageFile(inputPath);

      const output = outputPath || this.generateOutputPath(inputPath, 'rotated');

      const rotated = await sharp(inputPath)
        .rotate(angle)
        .toFile(output);

      return {
        path: output,
        angle,
        size: {
          width: rotated.width,
          height: rotated.height
        },
        format: rotated.format,
        fileSize: rotated.size
      };
    } catch (error) {
      throw new Error(`Error rotando imagen: ${error.message}`);
    }
  }

  /**
   * Obtiene metadata de una imagen
   * @param {string} inputPath - Ruta de la imagen
   * @returns {Promise<Object>} - Metadata de la imagen
   */
  async getMetadata(inputPath) {
    try {
      await this.validateImageFile(inputPath);

      const metadata = await sharp(inputPath).metadata();
      const stats = await fs.stat(inputPath);

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        fileSize: stats.size,
        fileSizeReadable: this.formatFileSize(stats.size)
      };
    } catch (error) {
      throw new Error(`Error obteniendo metadata: ${error.message}`);
    }
  }

  /**
   * Optimiza imagen para web (redimensiona y comprime)
   * @param {string} inputPath - Ruta de la imagen original
   * @param {Object} options - Opciones de optimizacion
   * @param {number} options.maxWidth - Ancho maximo (default 1920)
   * @param {number} options.maxHeight - Alto maximo (default 1080)
   * @param {number} options.quality - Calidad (default 80)
   * @param {string} options.outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Informacion de la imagen optimizada
   */
  async optimizeForWeb(inputPath, options = {}) {
    try {
      const { 
        maxWidth = 1920, 
        maxHeight = 1080, 
        quality = 80, 
        outputPath 
      } = options;

      await this.validateImageFile(inputPath);

      const output = outputPath || this.generateOutputPath(inputPath, 'optimized');
      const originalStats = await fs.stat(inputPath);

      const optimized = await sharp(inputPath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality, progressive: true })
        .toFile(output);

      const compressionRatio = ((originalStats.size - optimized.size) / originalStats.size * 100).toFixed(2);

      return {
        path: output,
        originalSize: originalStats.size,
        optimizedSize: optimized.size,
        compressionRatio: `${compressionRatio}%`,
        dimensions: {
          width: optimized.width,
          height: optimized.height
        },
        format: optimized.format
      };
    } catch (error) {
      throw new Error(`Error optimizando imagen: ${error.message}`);
    }
  }

  /**
   * Valida que el archivo sea una imagen valida
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>} - true si es valido
   */
  async validateImageFile(filePath) {
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('El archivo no existe');
      }

      const stats = await fs.stat(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo excede el tamano maximo permitido (${this.formatFileSize(MAX_FILE_SIZE)})`);
      }

      const metadata = await sharp(filePath).metadata();
      const allowedFormats = ['jpeg', 'png', 'webp', 'gif', 'bmp'];
      
      if (!allowedFormats.includes(metadata.format)) {
        throw new Error(`Formato de imagen no soportado: ${metadata.format}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Validacion fallida: ${error.message}`);
    }
  }

  /**
   * Genera ruta de salida automatica
   * @param {string} originalPath - Ruta original
   * @param {string} suffix - Sufijo a agregar
   * @returns {string} - Nueva ruta
   */
  generateOutputPath(originalPath, suffix) {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const name = path.basename(originalPath, ext);
    const timestamp = Date.now();
    
    return path.join(dir, `${name}_${suffix}_${timestamp}${ext}`);
  }

  /**
   * Formatea tamano de archivo en formato legible
   * @param {number} bytes - Tamano en bytes
   * @returns {string} - Tamano formateado
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Elimina archivo temporal
   * @param {string} filePath - Ruta del archivo a eliminar
   * @returns {Promise<boolean>} - true si se elimino correctamente
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error eliminando archivo: ${error.message}`);
      return false;
    }
  }
}

module.exports = new ImageProcessorService();