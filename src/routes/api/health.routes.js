// src/routes/api/health.routes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verificar estado del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /api/health/status:
 *   get:
 *     summary: Estado detallado del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Estado detallado obtenido exitosamente
 */
router.get('/status', (req, res) => {
  const status = {
    success: true,
    server: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A',
      readyState: mongoose.connection.readyState
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
    },
    cpu: {
      user: process.cpuUsage().user,
      system: process.cpuUsage().system
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    process: {
      pid: process.pid,
      ppid: process.ppid,
      execPath: process.execPath
    }
  };

  res.status(200).json(status);
});

/**
 * @swagger
 * /api/health/db:
 *   get:
 *     summary: Verificar conexion a la base de datos
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Base de datos conectada
 *       503:
 *         description: Base de datos desconectada
 */
router.get('/db', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isConnected = dbState === 1;

  res.status(isConnected ? 200 : 503).json({
    success: isConnected,
    database: {
      status: states[dbState],
      readyState: dbState,
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A',
      port: mongoose.connection.port || 'N/A'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Ping simple
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Pong
 */
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Verificar si el servidor esta listo
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor listo
 *       503:
 *         description: Servidor no listo
 */
router.get('/ready', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const memoryUsage = process.memoryUsage();
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const isReady = dbConnected && memoryPercentage < 90;

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    ready: isReady,
    checks: {
      database: dbConnected,
      memory: memoryPercentage < 90,
      uptime: process.uptime() > 0
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Verificar si el servidor esta vivo
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor vivo
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    alive: true,
    message: 'Servidor vivo',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;