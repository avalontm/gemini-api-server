// src/config/multer.config.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Configuracion de Multer para subida de archivos
 */

// Crear directorios si no existen
const createUploadDirs = () => {
  const dirs = [
    process.env.UPLOAD_DIR_IMAGES || 'uploads/images',
    process.env.UPLOAD_DIR_AUDIO || 'uploads/audio',
    process.env.UPLOAD_DIR_PDFS || 'uploads/pdfs',
  ];
  
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Crear directorios al cargar el modulo
createUploadDirs();

/**
 * Configuracion de almacenamiento
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = 'uploads/';
    
    // Determinar directorio segun tipo de archivo
    if (file.mimetype.startsWith('image/')) {
      uploadDir = process.env.UPLOAD_DIR_IMAGES || 'uploads/images';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadDir = process.env.UPLOAD_DIR_AUDIO || 'uploads/audio';
    } else if (file.mimetype === 'application/pdf') {
      uploadDir = process.env.UPLOAD_DIR_PDFS || 'uploads/pdfs';
    }
    
    cb(null, uploadDir);
  },
  
  filename: (req, file, cb) => {
    // Generar nombre unico con timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

/**
 * Filtro de archivos por tipo MIME
 */
const fileFilter = (req, file, cb) => {
  // Obtener tipos permitidos desde variables de entorno
  const allowedImages = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(',');
  const allowedAudio = (process.env.ALLOWED_AUDIO_TYPES || 'audio/wav,audio/mpeg,audio/webm,audio/mp3').split(',');
  const allowedPDF = (process.env.ALLOWED_PDF_TYPES || 'application/pdf').split(',');
  
  const allAllowedTypes = [...allowedImages, ...allowedAudio, ...allowedPDF];
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

/**
 * Configuracion principal de Multer
 */
const multerConfig = {
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // Tamaño maximo de archivo
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB por defecto
    
    // Numero maximo de archivos
    files: 10,
    
    // Tamaño maximo de campos
    fieldSize: 1 * 1024 * 1024, // 1MB
    
    // Numero maximo de campos
    fields: 20,
  },
};

/**
 * Instancia de Multer para subida multiple
 */
const upload = multer(multerConfig);

/**
 * Configuraciones especificas por tipo de contenido
 */
const uploadConfigs = {
  // Subida de una sola imagen
  singleImage: upload.single('image'),
  
  // Subida de multiples imagenes (maximo 5)
  multipleImages: upload.array('images', 5),
  
  // Subida de un solo archivo de audio
  singleAudio: upload.single('audio'),
  
  // Subida de un solo PDF
  singlePDF: upload.single('pdf'),
  
  // Subida multimodal (imagen + audio)
  multimodal: upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]),
  
  // Subida de cualquier tipo de archivo
  any: upload.any(),
};

/**
 * Limpiar archivo subido
 * @param {string} filePath - Ruta del archivo a eliminar
 */
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Archivo eliminado: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error al eliminar archivo ${filePath}:`, error.message);
  }
};

/**
 * Limpiar multiples archivos
 * @param {Array<string>} filePaths - Array de rutas de archivos
 */
const cleanupFiles = (filePaths) => {
  filePaths.forEach((filePath) => {
    cleanupFile(filePath);
  });
};

/**
 * Limpiar archivos antiguos (mas de X horas)
 * @param {number} hours - Horas de antiguedad
 */
const cleanupOldFiles = (hours = 24) => {
  const dirs = [
    process.env.UPLOAD_DIR_IMAGES || 'uploads/images',
    process.env.UPLOAD_DIR_AUDIO || 'uploads/audio',
    process.env.UPLOAD_DIR_PDFS || 'uploads/pdfs',
  ];
  
  const now = Date.now();
  const maxAge = hours * 60 * 60 * 1000;
  
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.error(`Error al leer directorio ${dir}:`, err.message);
        return;
      }
      
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error(`Error al obtener stats de ${filePath}:`, err.message);
            return;
          }
          
          const age = now - stats.mtimeMs;
          
          if (age > maxAge) {
            cleanupFile(filePath);
          }
        });
      });
    });
  });
};

/**
 * Obtener informacion de archivo
 * @param {Object} file - Objeto de archivo de Multer
 * @returns {Object} - Informacion del archivo
 */
const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    destination: file.destination,
  };
};

module.exports = {
  upload,
  uploadConfigs,
  multerConfig,
  cleanupFile,
  cleanupFiles,
  cleanupOldFiles,
  getFileInfo,
  createUploadDirs,
};