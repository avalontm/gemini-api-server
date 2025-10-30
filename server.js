// server.js

require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/database'); // CORREGIDO: destructuring
const logger = require('./src/utils/logger');
const fileStorageService = require('./src/services/utils/fileStorage.service');

// Verificar variables de entorno criticas
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Error: Faltan variables de entorno requeridas:', missingEnvVars.join(', '));
  console.error('Por favor, crea un archivo .env con las variables necesarias');
  process.exit(1);
}

// Variables de entorno
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Manejador de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION - Cerrando servidor...', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Manejador de promesas rechazadas no manejadas
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION - Cerrando servidor...', {
    reason,
    promise
  });
  process.exit(1);
});

// Funcion para inicializar el servidor
async function startServer() {
  try {
    // 1. Conectar a MongoDB
    logger.info('Conectando a MongoDB...');
    await connectDB();
    logger.info('MongoDB conectado exitosamente');

    // 2. Inicializar directorios de almacenamiento
    logger.info('Inicializando directorios de almacenamiento...');
    const storageInit = await fileStorageService.initializeDirectories();
    
    if (storageInit.success) {
      logger.info('Directorios inicializados correctamente', {
        created: storageInit.created.length,
        existing: storageInit.existing.length
      });
    } else {
      logger.warn('Algunos directorios no se pudieron crear', {
        errors: storageInit.errors
      });
    }

    // 3. Limpiar archivos temporales antiguos al iniciar
    if (NODE_ENV === 'production') {
      logger.info('Limpiando archivos temporales antiguos...');
      const cleanResult = await fileStorageService.cleanTemporaryFiles(24);
      logger.info('Limpieza completada', {
        deletedFiles: cleanResult.deletedFiles,
        freedSpace: cleanResult.freedSpace
      });
    }

    // 4. Iniciar servidor HTTP
    const server = app.listen(PORT, () => {
      logger.info('Servidor iniciado exitosamente', {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid
      });

      // URLs importantes
      logger.info('URLs disponibles:', {
        server: `http://localhost:${PORT}`,
        health: `http://localhost:${PORT}/health`,
        docs: `http://localhost:${PORT}/api/docs`,
        api: `http://localhost:${PORT}/api`
      });
    });

    // 5. Configurar timeout del servidor
    server.timeout = 120000; // 2 minutos

    // 6. Configurar manejador de cierre graceful
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} recibido - Iniciando cierre graceful...`);

      // Dejar de aceptar nuevas conexiones
      server.close(async () => {
        logger.info('Servidor HTTP cerrado');

        try {
          // Cerrar conexion a MongoDB
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          logger.info('Conexion a MongoDB cerrada');

          // Limpiar archivos temporales antes de cerrar
          if (NODE_ENV === 'production') {
            logger.info('Limpieza final de archivos temporales...');
            await fileStorageService.cleanTemporaryFiles(1);
          }

          logger.info('Cierre graceful completado exitosamente');
          process.exit(0);
        } catch (error) {
          logger.error('Error durante cierre graceful', {
            error: error.message,
            stack: error.stack
          });
          process.exit(1);
        }
      });

      // Forzar cierre despues de 30 segundos
      setTimeout(() => {
        logger.error('Cierre forzado - timeout de 30 segundos excedido');
        process.exit(1);
      }, 30000);
    };

    // Escuchar señales de terminacion
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 7. Programar tareas de mantenimiento periodicas
    if (NODE_ENV === 'production') {
      // Limpiar archivos temporales cada 6 horas
      setInterval(async () => {
        try {
          logger.info('Ejecutando limpieza programada de archivos temporales...');
          const result = await fileStorageService.cleanTemporaryFiles(24);
          logger.info('Limpieza programada completada', {
            deletedFiles: result.deletedFiles,
            freedSpace: result.freedSpace
          });
        } catch (error) {
          logger.error('Error en limpieza programada', {
            error: error.message
          });
        }
      }, 6 * 60 * 60 * 1000); // 6 horas

      // Limpiar exportaciones antiguas cada 24 horas
      setInterval(async () => {
        try {
          logger.info('Ejecutando limpieza programada de exportaciones...');
          const result = await fileStorageService.cleanExportFiles(7);
          logger.info('Limpieza de exportaciones completada', {
            deletedFiles: result.deletedFiles,
            freedSpace: result.freedSpace
          });
        } catch (error) {
          logger.error('Error en limpieza de exportaciones', {
            error: error.message
          });
        }
      }, 24 * 60 * 60 * 1000); // 24 horas

      // Mostrar estadisticas de almacenamiento cada hora
      setInterval(async () => {
        try {
          const stats = await fileStorageService.getStorageStats();
          logger.info('Estadisticas de almacenamiento', {
            totalFiles: stats.total.count,
            totalSize: stats.total.sizeReadable,
            uploads: {
              images: stats.uploads.images.count,
              audio: stats.uploads.audio.count,
              pdfs: stats.uploads.pdfs.count,
              temp: stats.uploads.temp.count
            }
          });
        } catch (error) {
          logger.error('Error obteniendo estadisticas', {
            error: error.message
          });
        }
      }, 60 * 60 * 1000); // 1 hora
    }

    return server;

  } catch (error) {
    logger.error('Error fatal al iniciar servidor', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Iniciar servidor
startServer().catch((error) => {
  logger.error('Error no manejado al iniciar servidor', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Exportar para testing
module.exports = startServer;