// src/routes/health.routes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verificar estado del servidor
 *     description: Endpoint para verificar si el servidor esta funcionando correctamente
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Servidor funcionando correctamente
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/health/status:
 *   get:
 *     summary: Estado detallado del servidor
 *     description: Proporciona informacion detallada sobre el estado del servidor y sus dependencias
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Estado detallado del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 services:
 *                   type: object
 */
router.get('/status', async (req, res) => {
  try {
    // Verificar conexion a MongoDB
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Verificar API Key de Gemini
    const geminiStatus = process.env.GEMINI_API_KEY ? 'configured' : 'not configured';
    
    // Informacion del sistema
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const status = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutos`,
      uptimeSeconds: uptime,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: {
          status: mongoStatus,
          type: 'MongoDB',
        },
        gemini: {
          status: geminiStatus,
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        },
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        },
        cpu: {
          usage: process.cpuUsage(),
        },
      },
    };
    
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      message: 'Error al obtener el estado del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/health/db:
 *   get:
 *     summary: Verificar conexion a la base de datos
 *     description: Endpoint para verificar el estado de la conexion a MongoDB
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Estado de la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.get('/db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    
    const status = states[dbState] || 'unknown';
    const isHealthy = dbState === 1;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: status,
      message: isHealthy 
        ? 'Conexion a base de datos establecida' 
        : 'No hay conexion a la base de datos',
      database: {
        name: mongoose.connection.name || 'N/A',
        host: mongoose.connection.host || 'N/A',
        readyState: dbState,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      message: 'Error al verificar conexion a base de datos',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Ping simple
 *     description: Responde con pong para verificar conectividad basica
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Pong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: pong
 */
router.get('/ping', (req, res) => {
  res.status(200).json({
    message: 'pong',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Verificar si el servidor esta listo
 *     description: Verifica si el servidor y sus dependencias estan listos para recibir trafico
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor listo
 *       503:
 *         description: Servidor no listo
 */
router.get('/ready', async (req, res) => {
  try {
    const checks = {
      database: mongoose.connection.readyState === 1,
      gemini: !!process.env.GEMINI_API_KEY,
      jwt: !!process.env.JWT_SECRET,
    };
    
    const allReady = Object.values(checks).every(check => check === true);
    
    if (allReady) {
      res.status(200).json({
        success: true,
        ready: true,
        message: 'Servidor listo para recibir trafico',
        checks,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        ready: false,
        message: 'Servidor no esta listo',
        checks,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      ready: false,
      message: 'Error al verificar estado del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Verificar si el servidor esta vivo
 *     description: Liveness probe para Kubernetes y otros orchestradores
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor vivo
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;