// src/middlewares/fileUpload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validationErrorResponse } = require('../utils/helpers/responseFormatter');
const { generateUniqueFilename } = require('../utils/helpers/fileHelper');

// Configuracion de tipos MIME permitidos
const ALLOWED_IMAGE_TYPES = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(',');
const ALLOWED_AUDIO_TYPES = (process.env.ALLOWED_AUDIO_TYPES || 'audio/wav,audio/mpeg,audio/webm,audio/mp3').split(',');
const ALLOWED_PDF_TYPES = (process.env.ALLOWED_PDF_TYPES || 'application/pdf').split(',');

// Tamaño maximo de archivo (default: 10MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

// Asegurar que existan los directorios de upload
const ensureUploadDirs = () => {
  const dirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads', 'images'),
    path.join(process.cwd(), 'uploads', 'audio'),
    path.join(process.cwd(), 'uploads', 'pdfs'),
    path.join(process.cwd(), 'uploads', 'temp'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

/**
 * Storage configurado para imagenes
 */
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'images'));
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname, 'img_');
    cb(null, uniqueName);
  },
});

/**
 * Storage configurado para archivos de audio
 */
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'audio'));
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname, 'audio_');
    cb(null, uniqueName);
  },
});

/**
 * Storage configurado para archivos PDF
 */
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'pdfs'));
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname, 'pdf_');
    cb(null, uniqueName);
  },
});

/**
 * Storage configurado para archivos temporales
 */
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'temp'));
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname, 'temp_');
    cb(null, uniqueName);
  },
});

/**
 * File filter para imagenes
 */
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de imagen no permitido. Tipos permitidos: ${ALLOWED_IMAGE_TYPES.join(', ')}`), false);
  }
};

/**
 * File filter para audio
 */
const audioFileFilter = (req, file, cb) => {
  if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de audio no permitido. Tipos permitidos: ${ALLOWED_AUDIO_TYPES.join(', ')}`), false);
  }
};

/**
 * File filter para PDFs
 */
const pdfFileFilter = (req, file, cb) => {
  if (ALLOWED_PDF_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

/**
 * File filter general que acepta imagenes, audio y PDFs
 */
const multiFileFilter = (req, file, cb) => {
  const allAllowedTypes = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_AUDIO_TYPES,
    ...ALLOWED_PDF_TYPES,
  ];

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Tipos permitidos: ${allAllowedTypes.join(', ')}`), false);
  }
};

/**
 * Configuracion de Multer para imagenes
 */
const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: imageFileFilter,
});

/**
 * Configuracion de Multer para audio
 */
const uploadAudio = multer({
  storage: audioStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: audioFileFilter,
});

/**
 * Configuracion de Multer para PDFs
 */
const uploadPDF = multer({
  storage: pdfStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: pdfFileFilter,
});

/**
 * Configuracion de Multer para multiples tipos de archivos
 */
const uploadMulti = multer({
  storage: tempStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: multiFileFilter,
});

/**
 * Configuracion de Multer sin restricciones (usar con cuidado)
 */
const uploadAny = multer({
  storage: tempStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Middleware para manejar una sola imagen
 */
const singleImage = (fieldName = 'image') => {
  return (req, res, next) => {
    uploadImage.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return validationErrorResponse(res, [
            {
              field: fieldName,
              message: `El archivo excede el tamaño maximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            },
          ]);
        }
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      } else if (err) {
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      }
      next();
    });
  };
};

/**
 * Middleware para manejar un solo archivo de audio
 */
const singleAudio = (fieldName = 'audio') => {
  return (req, res, next) => {
    uploadAudio.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return validationErrorResponse(res, [
            {
              field: fieldName,
              message: `El archivo excede el tamaño maximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            },
          ]);
        }
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      } else if (err) {
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      }
      next();
    });
  };
};

/**
 * Middleware para manejar un solo archivo PDF
 */
const singlePDF = (fieldName = 'pdf') => {
  return (req, res, next) => {
    uploadPDF.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return validationErrorResponse(res, [
            {
              field: fieldName,
              message: `El archivo excede el tamaño maximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            },
          ]);
        }
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      } else if (err) {
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      }
      next();
    });
  };
};

/**
 * Middleware para manejar multiples imagenes
 */
const multipleImages = (fieldName = 'images', maxCount = 5) => {
  return (req, res, next) => {
    uploadImage.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return validationErrorResponse(res, [
            {
              field: fieldName,
              message: `Uno o mas archivos exceden el tamaño maximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            },
          ]);
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return validationErrorResponse(res, [
            {
              field: fieldName,
              message: `Maximo ${maxCount} archivos permitidos`,
            },
          ]);
        }
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      } else if (err) {
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      }
      next();
    });
  };
};

/**
 * Middleware para manejar archivos opcionales
 * No falla si no se proporciona archivo
 */
const optionalFile = (fieldName = 'file') => {
  return (req, res, next) => {
    uploadMulti.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return validationErrorResponse(res, [
            {
              field: fieldName,
              message: `El archivo excede el tamaño maximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            },
          ]);
        }
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      } else if (err) {
        return validationErrorResponse(res, [
          {
            field: fieldName,
            message: err.message,
          },
        ]);
      }
      next();
    });
  };
};

/**
 * Middleware para verificar que se proporciono un archivo
 */
const requireFile = (fieldName = 'file') => {
  return (req, res, next) => {
    if (!req.file) {
      return validationErrorResponse(res, [
        {
          field: fieldName,
          message: 'Archivo requerido',
        },
      ]);
    }
    next();
  };
};

module.exports = {
  singleImage,
  singleAudio,
  singlePDF,
  multipleImages,
  optionalFile,
  requireFile,
  uploadImage,
  uploadAudio,
  uploadPDF,
  uploadMulti,
  uploadAny,
};