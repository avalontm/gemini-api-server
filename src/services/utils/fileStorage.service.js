// src/services/utils/fileStorage.service.js

const fs = require('fs').promises;
const path = require('path');

class FileStorageService {
  constructor() {
    this.baseUploadDir = path.join(__dirname, '../../../uploads');
    this.baseExportDir = path.join(__dirname, '../../../exports');
    
    this.directories = {
      images: path.join(this.baseUploadDir, 'images'),
      audio: path.join(this.baseUploadDir, 'audio'),
      pdfs: path.join(this.baseUploadDir, 'pdfs'),
      temp: path.join(this.baseUploadDir, 'temp'),
      exports: {
        pdf: path.join(this.baseExportDir, 'pdf'),
        txt: path.join(this.baseExportDir, 'txt')
      }
    };
  }

  /**
   * Inicializa todos los directorios necesarios
   * @returns {Promise<Object>} - Resultado de inicializacion
   */
  async initializeDirectories() {
    try {
      const results = {
        created: [],
        existing: [],
        errors: []
      };

      const dirs = [
        this.directories.images,
        this.directories.audio,
        this.directories.pdfs,
        this.directories.temp,
        this.directories.exports.pdf,
        this.directories.exports.txt
      ];

      for (const dir of dirs) {
        try {
          await fs.mkdir(dir, { recursive: true });
          results.created.push(dir);
        } catch (error) {
          if (error.code === 'EEXIST') {
            results.existing.push(dir);
          } else {
            results.errors.push({ dir, error: error.message });
          }
        }
      }

      return {
        success: results.errors.length === 0,
        ...results
      };
    } catch (error) {
      throw new Error(`Error inicializando directorios: ${error.message}`);
    }
  }

  /**
   * Elimina archivos temporales antiguos
   * @param {number} maxAgeHours - Edad maxima en horas
   * @returns {Promise<Object>} - Resultado de limpieza
   */
  async cleanTemporaryFiles(maxAgeHours = 24) {
    try {
      const dirs = [
        this.directories.images,
        this.directories.audio,
        this.directories.pdfs,
        this.directories.temp
      ];

      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let totalDeleted = 0;
      let totalSize = 0;

      for (const dir of dirs) {
        try {
          const files = await fs.readdir(dir);

          for (const file of files) {
            const filePath = path.join(dir, file);
            
            try {
              const stats = await fs.stat(filePath);

              if (stats.mtimeMs < cutoffTime) {
                totalSize += stats.size;
                await fs.unlink(filePath);
                totalDeleted++;
              }
            } catch (fileError) {
              console.error(`Error procesando archivo ${file}: ${fileError.message}`);
            }
          }
        } catch (dirError) {
          console.error(`Error accediendo a directorio ${dir}: ${dirError.message}`);
        }
      }

      return {
        success: true,
        deletedFiles: totalDeleted,
        freedSpace: this.formatFileSize(totalSize),
        freedSpaceBytes: totalSize
      };
    } catch (error) {
      throw new Error(`Error limpiando archivos temporales: ${error.message}`);
    }
  }

  /**
   * Elimina archivos de exportacion antiguos
   * @param {number} maxAgeDays - Edad maxima en dias
   * @returns {Promise<Object>} - Resultado de limpieza
   */
  async cleanExportFiles(maxAgeDays = 7) {
    try {
      const exportDirs = [
        this.directories.exports.pdf,
        this.directories.exports.txt
      ];

      const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
      let totalDeleted = 0;
      let totalSize = 0;

      for (const dir of exportDirs) {
        try {
          const files = await fs.readdir(dir);

          for (const file of files) {
            const filePath = path.join(dir, file);
            
            try {
              const stats = await fs.stat(filePath);

              if (stats.mtimeMs < cutoffTime) {
                totalSize += stats.size;
                await fs.unlink(filePath);
                totalDeleted++;
              }
            } catch (fileError) {
              console.error(`Error procesando archivo ${file}: ${fileError.message}`);
            }
          }
        } catch (dirError) {
          console.error(`Error accediendo a directorio ${dir}: ${dirError.message}`);
        }
      }

      return {
        success: true,
        deletedFiles: totalDeleted,
        freedSpace: this.formatFileSize(totalSize),
        freedSpaceBytes: totalSize
      };
    } catch (error) {
      throw new Error(`Error limpiando archivos de exportacion: ${error.message}`);
    }
  }

  /**
   * Elimina un archivo especifico
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>} - true si se elimino correctamente
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error eliminando archivo ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Elimina multiples archivos
   * @param {Array<string>} filePaths - Array de rutas de archivos
   * @returns {Promise<Object>} - Resultado de eliminacion
   */
  async deleteFiles(filePaths) {
    const results = {
      deleted: [],
      failed: []
    };

    for (const filePath of filePaths) {
      const success = await this.deleteFile(filePath);
      if (success) {
        results.deleted.push(filePath);
      } else {
        results.failed.push(filePath);
      }
    }

    return {
      success: results.failed.length === 0,
      deletedCount: results.deleted.length,
      failedCount: results.failed.length,
      ...results
    };
  }

  /**
   * Obtiene informacion de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Object>} - Informacion del archivo
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(filePath);

      return {
        exists: true,
        fileName,
        filePath,
        extension,
        size: stats.size,
        sizeReadable: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          exists: false,
          filePath
        };
      }
      throw new Error(`Error obteniendo informacion del archivo: ${error.message}`);
    }
  }

  /**
   * Lista archivos en un directorio
   * @param {string} directory - Tipo de directorio (images, audio, pdfs, temp)
   * @param {Object} options - Opciones de listado
   * @returns {Promise<Array>} - Lista de archivos
   */
  async listFiles(directory, options = {}) {
    try {
      const {
        sortBy = 'modified',
        sortOrder = 'desc',
        limit = null,
        extension = null
      } = options;

      let dirPath;
      
      if (directory === 'exports-pdf') {
        dirPath = this.directories.exports.pdf;
      } else if (directory === 'exports-txt') {
        dirPath = this.directories.exports.txt;
      } else {
        dirPath = this.directories[directory];
      }

      if (!dirPath) {
        throw new Error(`Directorio invalido: ${directory}`);
      }

      const files = await fs.readdir(dirPath);
      const fileInfos = [];

      for (const file of files) {
        if (extension && !file.endsWith(extension)) {
          continue;
        }

        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          fileInfos.push({
            fileName: file,
            filePath,
            extension: path.extname(file),
            size: stats.size,
            sizeReadable: this.formatFileSize(stats.size),
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }

      fileInfos.sort((a, b) => {
        let comparison = 0;
        
        if (sortBy === 'modified') {
          comparison = b.modified - a.modified;
        } else if (sortBy === 'created') {
          comparison = b.created - a.created;
        } else if (sortBy === 'size') {
          comparison = b.size - a.size;
        } else if (sortBy === 'name') {
          comparison = a.fileName.localeCompare(b.fileName);
        }

        return sortOrder === 'asc' ? -comparison : comparison;
      });

      if (limit) {
        return fileInfos.slice(0, limit);
      }

      return fileInfos;
    } catch (error) {
      throw new Error(`Error listando archivos: ${error.message}`);
    }
  }

  /**
   * Obtiene estadisticas de almacenamiento
   * @returns {Promise<Object>} - Estadisticas de uso
   */
  async getStorageStats() {
    try {
      const stats = {
        uploads: {
          images: { count: 0, size: 0 },
          audio: { count: 0, size: 0 },
          pdfs: { count: 0, size: 0 },
          temp: { count: 0, size: 0 }
        },
        exports: {
          pdf: { count: 0, size: 0 },
          txt: { count: 0, size: 0 }
        },
        total: { count: 0, size: 0 }
      };

      for (const [key, dirPath] of Object.entries(this.directories)) {
        if (key === 'exports') continue;

        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await fs.stat(filePath);

            if (fileStat.isFile()) {
              stats.uploads[key].count++;
              stats.uploads[key].size += fileStat.size;
              stats.total.count++;
              stats.total.size += fileStat.size;
            }
          }

          stats.uploads[key].sizeReadable = this.formatFileSize(stats.uploads[key].size);
        } catch (error) {
          console.error(`Error procesando directorio ${key}: ${error.message}`);
        }
      }

      for (const [key, dirPath] of Object.entries(this.directories.exports)) {
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await fs.stat(filePath);

            if (fileStat.isFile()) {
              stats.exports[key].count++;
              stats.exports[key].size += fileStat.size;
              stats.total.count++;
              stats.total.size += fileStat.size;
            }
          }

          stats.exports[key].sizeReadable = this.formatFileSize(stats.exports[key].size);
        } catch (error) {
          console.error(`Error procesando directorio exports/${key}: ${error.message}`);
        }
      }

      stats.total.sizeReadable = this.formatFileSize(stats.total.size);

      return stats;
    } catch (error) {
      throw new Error(`Error obteniendo estadisticas: ${error.message}`);
    }
  }

  /**
   * Verifica si un archivo existe
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>} - true si existe
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copia un archivo
   * @param {string} sourcePath - Ruta origen
   * @param {string} destinationPath - Ruta destino
   * @returns {Promise<boolean>} - true si se copio correctamente
   */
  async copyFile(sourcePath, destinationPath) {
    try {
      await fs.copyFile(sourcePath, destinationPath);
      return true;
    } catch (error) {
      console.error(`Error copiando archivo: ${error.message}`);
      return false;
    }
  }

  /**
   * Mueve un archivo
   * @param {string} sourcePath - Ruta origen
   * @param {string} destinationPath - Ruta destino
   * @returns {Promise<boolean>} - true si se movio correctamente
   */
  async moveFile(sourcePath, destinationPath) {
    try {
      await fs.rename(sourcePath, destinationPath);
      return true;
    } catch (error) {
      console.error(`Error moviendo archivo: ${error.message}`);
      return false;
    }
  }

  /**
   * Lee el contenido de un archivo
   * @param {string} filePath - Ruta del archivo
   * @param {string} encoding - Codificacion (default: utf8)
   * @returns {Promise<string|Buffer>} - Contenido del archivo
   */
  async readFile(filePath, encoding = 'utf8') {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      throw new Error(`Error leyendo archivo: ${error.message}`);
    }
  }

  /**
   * Escribe contenido en un archivo
   * @param {string} filePath - Ruta del archivo
   * @param {string|Buffer} content - Contenido a escribir
   * @returns {Promise<boolean>} - true si se escribio correctamente
   */
  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content);
      return true;
    } catch (error) {
      console.error(`Error escribiendo archivo: ${error.message}`);
      return false;
    }
  }

  /**
   * Genera nombre de archivo unico
   * @param {string} originalName - Nombre original
   * @param {string} prefix - Prefijo opcional
   * @returns {string} - Nombre unico
   */
  generateUniqueFileName(originalName, prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    const sanitizedBaseName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);

    return `${prefix}${sanitizedBaseName}_${timestamp}_${random}${extension}`;
  }

  /**
   * Formatea tamano de archivo
   * @param {number} bytes - Tamano en bytes
   * @returns {string} - Tamano formateado
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Limpia todos los directorios
   * @param {Object} options - Opciones de limpieza
   * @returns {Promise<Object>} - Resultado de limpieza completa
   */
  async cleanAll(options = {}) {
    const {
      tempMaxAgeHours = 24,
      exportMaxAgeDays = 7
    } = options;

    try {
      const tempResult = await this.cleanTemporaryFiles(tempMaxAgeHours);
      const exportResult = await this.cleanExportFiles(exportMaxAgeDays);

      return {
        success: true,
        temporary: tempResult,
        exports: exportResult,
        totalDeleted: tempResult.deletedFiles + exportResult.deletedFiles,
        totalFreed: this.formatFileSize(
          tempResult.freedSpaceBytes + exportResult.freedSpaceBytes
        )
      };
    } catch (error) {
      throw new Error(`Error en limpieza completa: ${error.message}`);
    }
  }
}

module.exports = new FileStorageService();