// src/utils/helpers/fileHelper.js

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Helpers para manejo de archivos
 */

/**
 * Verificar si un archivo existe
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>} - True si existe
 */
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Crear directorio si no existe
 * @param {string} dirPath - Ruta del directorio
 * @returns {Promise<void>}
 */
const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Eliminar archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>} - True si se elimino correctamente
 */
const deleteFile = async (filePath) => {
  try {
    const exists = await fileExists(filePath);
    if (exists) {
      await fs.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error al eliminar archivo ${filePath}:`, error.message);
    return false;
  }
};

/**
 * Eliminar multiples archivos
 * @param {Array<string>} filePaths - Array de rutas
 * @returns {Promise<Object>} - Resultado de la operacion
 */
const deleteMultipleFiles = async (filePaths) => {
  const results = {
    deleted: 0,
    failed: 0,
    errors: [],
  };
  
  for (const filePath of filePaths) {
    const success = await deleteFile(filePath);
    if (success) {
      results.deleted++;
    } else {
      results.failed++;
      results.errors.push(filePath);
    }
  }
  
  return results;
};

/**
 * Mover archivo
 * @param {string} sourcePath - Ruta origen
 * @param {string} destPath - Ruta destino
 * @returns {Promise<boolean>} - True si se movio correctamente
 */
const moveFile = async (sourcePath, destPath) => {
  try {
    await ensureDir(path.dirname(destPath));
    await fs.rename(sourcePath, destPath);
    return true;
  } catch (error) {
    console.error(`Error al mover archivo de ${sourcePath} a ${destPath}:`, error.message);
    return false;
  }
};

/**
 * Copiar archivo
 * @param {string} sourcePath - Ruta origen
 * @param {string} destPath - Ruta destino
 * @returns {Promise<boolean>} - True si se copio correctamente
 */
const copyFile = async (sourcePath, destPath) => {
  try {
    await ensureDir(path.dirname(destPath));
    await fs.copyFile(sourcePath, destPath);
    return true;
  } catch (error) {
    console.error(`Error al copiar archivo de ${sourcePath} a ${destPath}:`, error.message);
    return false;
  }
};

/**
 * Leer archivo como texto
 * @param {string} filePath - Ruta del archivo
 * @param {string} encoding - Codificacion (por defecto utf8)
 * @returns {Promise<string|null>} - Contenido del archivo
 */
const readFileText = async (filePath, encoding = 'utf8') => {
  try {
    const content = await fs.readFile(filePath, encoding);
    return content;
  } catch (error) {
    console.error(`Error al leer archivo ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Leer archivo como buffer
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Buffer|null>} - Buffer del archivo
 */
const readFileBuffer = async (filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (error) {
    console.error(`Error al leer archivo ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Escribir archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string|Buffer} content - Contenido a escribir
 * @returns {Promise<boolean>} - True si se escribio correctamente
 */
const writeFile = async (filePath, content) => {
  try {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    return true;
  } catch (error) {
    console.error(`Error al escribir archivo ${filePath}:`, error.message);
    return false;
  }
};

/**
 * Obtener tamaño de archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<number|null>} - Tamaño en bytes
 */
const getFileSize = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error(`Error al obtener tamaño de ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Obtener estadisticas de archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object|null>} - Estadisticas del archivo
 */
const getFileStats = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    console.error(`Error al obtener stats de ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Generar nombre de archivo unico
 * @param {string} originalName - Nombre original
 * @param {string} prefix - Prefijo opcional
 * @returns {string} - Nombre unico
 */
const generateUniqueFilename = (originalName, prefix = '') => {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  
  return `${prefix}${sanitizedName}_${timestamp}_${random}${ext}`;
};

/**
 * Limpiar archivos antiguos en un directorio
 * @param {string} dirPath - Ruta del directorio
 * @param {number} maxAgeHours - Edad maxima en horas
 * @returns {Promise<Object>} - Resultado de la operacion
 */
const cleanupOldFiles = async (dirPath, maxAgeHours = 24) => {
  const results = {
    deleted: 0,
    failed: 0,
    errors: [],
  };
  
  try {
    const exists = await fileExists(dirPath);
    if (!exists) {
      return results;
    }
    
    const files = await fs.readdir(dirPath);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      
      try {
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          const age = now - stats.mtimeMs;
          
          if (age > maxAge) {
            const success = await deleteFile(filePath);
            if (success) {
              results.deleted++;
            } else {
              results.failed++;
              results.errors.push(filePath);
            }
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error al limpiar directorio ${dirPath}:`, error.message);
  }
  
  return results;
};

/**
 * Listar archivos en un directorio
 * @param {string} dirPath - Ruta del directorio
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Array>} - Lista de archivos
 */
const listFiles = async (dirPath, options = {}) => {
  const {
    extension = null,
    recursive = false,
    includeStats = false,
  } = options;
  
  try {
    const exists = await fileExists(dirPath);
    if (!exists) {
      return [];
    }
    
    const files = await fs.readdir(dirPath);
    const results = [];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory() && recursive) {
        const subFiles = await listFiles(filePath, options);
        results.push(...subFiles);
      } else if (stats.isFile()) {
        if (!extension || path.extname(file) === extension) {
          if (includeStats) {
            results.push({
              name: file,
              path: filePath,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime,
            });
          } else {
            results.push(filePath);
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error al listar archivos de ${dirPath}:`, error.message);
    return [];
  }
};

/**
 * Obtener extension de archivo
 * @param {string} filename - Nombre del archivo
 * @returns {string} - Extension sin el punto
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().substring(1);
};

/**
 * Calcular hash de archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} algorithm - Algoritmo (md5, sha256, etc)
 * @returns {Promise<string|null>} - Hash del archivo
 */
const calculateFileHash = async (filePath, algorithm = 'md5') => {
  try {
    const buffer = await readFileBuffer(filePath);
    if (!buffer) {
      return null;
    }
    
    const hash = crypto.createHash(algorithm);
    hash.update(buffer);
    return hash.digest('hex');
  } catch (error) {
    console.error(`Error al calcular hash de ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Verificar si un directorio esta vacio
 * @param {string} dirPath - Ruta del directorio
 * @returns {Promise<boolean>} - True si esta vacio
 */
const isDirectoryEmpty = async (dirPath) => {
  try {
    const files = await fs.readdir(dirPath);
    return files.length === 0;
  } catch (error) {
    return true;
  }
};

/**
 * Crear archivo temporal
 * @param {string} content - Contenido del archivo
 * @param {string} extension - Extension del archivo
 * @returns {Promise<string|null>} - Ruta del archivo temporal
 */
const createTempFile = async (content, extension = '.txt') => {
  try {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    await ensureDir(tempDir);
    
    const filename = `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${extension}`;
    const filePath = path.join(tempDir, filename);
    
    const success = await writeFile(filePath, content);
    return success ? filePath : null;
  } catch (error) {
    console.error('Error al crear archivo temporal:', error.message);
    return null;
  }
};

module.exports = {
  fileExists,
  ensureDir,
  deleteFile,
  deleteMultipleFiles,
  moveFile,
  copyFile,
  readFileText,
  readFileBuffer,
  writeFile,
  getFileSize,
  getFileStats,
  generateUniqueFilename,
  cleanupOldFiles,
  listFiles,
  getFileExtension,
  calculateFileHash,
  isDirectoryEmpty,
  createTempFile,
};