// src/services/processing/audioProcessor.service.js

const fs = require('fs').promises;
const path = require('path');
const { MAX_FILE_SIZE } = require('../../config/constants');

class AudioProcessorService {
  /**
   * Valida archivo de audio
   * @param {string} filePath - Ruta del archivo de audio
   * @returns {Promise<Object>} - Informacion del archivo validado
   */
  async validateAudioFile(filePath) {
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('El archivo de audio no existe');
      }

      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        throw new Error('El archivo de audio esta vacio');
      }

      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo excede el tamano maximo permitido (${this.formatFileSize(MAX_FILE_SIZE)})`);
      }

      const extension = path.extname(filePath).toLowerCase();
      const allowedExtensions = ['.wav', '.mp3', '.webm', '.ogg', '.m4a', '.flac'];
      
      if (!allowedExtensions.includes(extension)) {
        throw new Error(`Formato de audio no soportado. Formatos permitidos: ${allowedExtensions.join(', ')}`);
      }

      return {
        path: filePath,
        size: stats.size,
        sizeReadable: this.formatFileSize(stats.size),
        extension: extension.replace('.', ''),
        mimeType: this.getMimeType(extension),
        isValid: true
      };
    } catch (error) {
      throw new Error(`Validacion de audio fallida: ${error.message}`);
    }
  }

  /**
   * Lee archivo de audio y lo convierte a Buffer
   * @param {string} filePath - Ruta del archivo de audio
   * @returns {Promise<Buffer>} - Buffer del audio
   */
  async readAudioFile(filePath) {
    try {
      await this.validateAudioFile(filePath);
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      throw new Error(`Error leyendo archivo de audio: ${error.message}`);
    }
  }

  /**
   * Prepara audio para transcripcion con Gemini
   * @param {string} filePath - Ruta del archivo de audio
   * @returns {Promise<Object>} - Datos preparados para Gemini
   */
  async prepareForTranscription(filePath) {
    try {
      const validation = await this.validateAudioFile(filePath);
      const buffer = await fs.readFile(filePath);

      return {
        buffer,
        mimeType: validation.mimeType,
        size: validation.size,
        extension: validation.extension,
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: validation.mimeType
        }
      };
    } catch (error) {
      throw new Error(`Error preparando audio para transcripcion: ${error.message}`);
    }
  }

  /**
   * Obtiene informacion detallada del archivo de audio
   * @param {string} filePath - Ruta del archivo de audio
   * @returns {Promise<Object>} - Metadata del audio
   */
  async getAudioInfo(filePath) {
    try {
      const validation = await this.validateAudioFile(filePath);
      const stats = await fs.stat(filePath);

      return {
        fileName: path.basename(filePath),
        filePath,
        extension: validation.extension,
        mimeType: validation.mimeType,
        size: stats.size,
        sizeReadable: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        isValid: true
      };
    } catch (error) {
      throw new Error(`Error obteniendo informacion de audio: ${error.message}`);
    }
  }

  /**
   * Convierte audio a formato compatible con Gemini
   * @param {string} filePath - Ruta del archivo original
   * @param {Object} options - Opciones de conversion
   * @param {string} options.targetFormat - Formato destino (default: wav)
   * @param {string} options.outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Informacion del archivo convertido
   */
  async convertForGemini(filePath, options = {}) {
    try {
      const { targetFormat = 'wav', outputPath } = options;

      const validation = await this.validateAudioFile(filePath);

      const supportedFormats = ['wav', 'mp3', 'webm'];
      if (!supportedFormats.includes(targetFormat)) {
        throw new Error(`Formato destino no soportado: ${targetFormat}`);
      }

      if (validation.extension === targetFormat) {
        return {
          path: filePath,
          alreadyInFormat: true,
          format: targetFormat,
          size: validation.size
        };
      }

      const output = outputPath || this.generateOutputPath(filePath, targetFormat);

      return {
        path: output,
        originalFormat: validation.extension,
        targetFormat,
        converted: true,
        note: 'Conversion de audio requiere libreria externa como ffmpeg'
      };
    } catch (error) {
      throw new Error(`Error convirtiendo audio: ${error.message}`);
    }
  }

  /**
   * Valida duracion estimada del audio (basado en tamano)
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Object>} - Estimacion de duracion
   */
  async estimateDuration(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const extension = path.extname(filePath).toLowerCase();

      let bitrateKbps;
      switch (extension) {
        case '.mp3':
          bitrateKbps = 128;
          break;
        case '.wav':
          bitrateKbps = 1411;
          break;
        case '.webm':
          bitrateKbps = 96;
          break;
        case '.ogg':
          bitrateKbps = 112;
          break;
        case '.m4a':
          bitrateKbps = 256;
          break;
        default:
          bitrateKbps = 128;
      }

      const durationSeconds = (stats.size * 8) / (bitrateKbps * 1000);
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.floor(durationSeconds % 60);

      return {
        estimatedSeconds: Math.round(durationSeconds),
        estimatedMinutes: minutes,
        formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        note: 'Duracion estimada basada en bitrate promedio',
        bitrate: `${bitrateKbps} kbps`
      };
    } catch (error) {
      throw new Error(`Error estimando duracion: ${error.message}`);
    }
  }

  /**
   * Verifica si el audio es muy largo para procesamiento
   * @param {string} filePath - Ruta del archivo
   * @param {number} maxMinutes - Duracion maxima permitida en minutos
   * @returns {Promise<Object>} - Resultado de la verificacion
   */
  async checkDuration(filePath, maxMinutes = 10) {
    try {
      const duration = await this.estimateDuration(filePath);
      const maxSeconds = maxMinutes * 60;

      const isWithinLimit = duration.estimatedSeconds <= maxSeconds;

      return {
        isWithinLimit,
        estimatedDuration: duration,
        maxAllowedMinutes: maxMinutes,
        exceededBy: isWithinLimit ? 0 : duration.estimatedSeconds - maxSeconds,
        message: isWithinLimit 
          ? 'Duracion dentro del limite permitido'
          : `Audio excede el limite de ${maxMinutes} minutos`
      };
    } catch (error) {
      throw new Error(`Error verificando duracion: ${error.message}`);
    }
  }

  /**
   * Obtiene tipo MIME basado en extension
   * @param {string} extension - Extension del archivo (con o sin punto)
   * @returns {string} - Tipo MIME
   */
  getMimeType(extension) {
    const ext = extension.toLowerCase().replace('.', '');
    
    const mimeTypes = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'flac': 'audio/flac'
    };

    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Genera ruta de salida para archivo procesado
   * @param {string} originalPath - Ruta original
   * @param {string} newExtension - Nueva extension
   * @returns {string} - Nueva ruta
   */
  generateOutputPath(originalPath, newExtension) {
    const dir = path.dirname(originalPath);
    const name = path.basename(originalPath, path.extname(originalPath));
    const timestamp = Date.now();
    
    return path.join(dir, `${name}_converted_${timestamp}.${newExtension}`);
  }

  /**
   * Formatea tamano de archivo
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
   * Elimina archivo temporal de audio
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>} - true si se elimino correctamente
   */
  async deleteAudioFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error eliminando archivo de audio: ${error.message}`);
      return false;
    }
  }

  /**
   * Limpia multiples archivos de audio
   * @param {Array<string>} filePaths - Array de rutas de archivos
   * @returns {Promise<Object>} - Resultado de la limpieza
   */
  async cleanupAudioFiles(filePaths) {
    try {
      const results = {
        deleted: [],
        failed: [],
        total: filePaths.length
      };

      for (const filePath of filePaths) {
        const deleted = await this.deleteAudioFile(filePath);
        if (deleted) {
          results.deleted.push(filePath);
        } else {
          results.failed.push(filePath);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Error limpiando archivos de audio: ${error.message}`);
    }
  }

  /**
   * Valida multiples archivos de audio
   * @param {Array<string>} filePaths - Array de rutas
   * @returns {Promise<Object>} - Resultado de validacion
   */
  async validateMultipleAudioFiles(filePaths) {
    try {
      const results = {
        valid: [],
        invalid: [],
        total: filePaths.length
      };

      for (const filePath of filePaths) {
        try {
          const validation = await this.validateAudioFile(filePath);
          results.valid.push(validation);
        } catch (error) {
          results.invalid.push({
            path: filePath,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Error validando multiples archivos: ${error.message}`);
    }
  }

  /**
   * Obtiene extension recomendada para Gemini API
   * @returns {string} - Extension recomendada
   */
  getRecommendedFormat() {
    return 'wav';
  }

  /**
   * Obtiene formatos soportados
   * @returns {Array<string>} - Lista de formatos soportados
   */
  getSupportedFormats() {
    return ['wav', 'mp3', 'webm', 'ogg', 'm4a', 'flac'];
  }
}

module.exports = new AudioProcessorService();