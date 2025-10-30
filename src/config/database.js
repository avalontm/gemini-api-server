// src/config/database.js

const mongoose = require('mongoose');

/**
 * Configuracion de la conexion a MongoDB
 */
const databaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gemini-api',
  
  options: {
    // Timeout de conexion (10 segundos)
    serverSelectionTimeoutMS: 10000,
    
    // Timeout de socket (45 segundos)
    socketTimeoutMS: 45000,
    
    // Pool de conexiones
    maxPoolSize: 10,
    minPoolSize: 2,
    
    // Retry de escrituras
    retryWrites: true,
    
    // Nivel de write concern
    w: 'majority',
  },
};

/**
 * Conectar a MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(databaseConfig.uri, databaseConfig.options);
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    console.log(`Base de datos: ${conn.connection.name}`);
    
    // Eventos de conexion
    mongoose.connection.on('connected', () => {
      console.log('Mongoose conectado a la base de datos');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Error de conexion de Mongoose:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose desconectado de la base de datos');
    });
    
    // Manejar terminacion del proceso
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexion de Mongoose cerrada debido a terminacion de la aplicacion');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Desconectar de MongoDB
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('Desconectado de MongoDB');
  } catch (error) {
    console.error('Error al desconectar de MongoDB:', error.message);
  }
};

/**
 * Verificar estado de la conexion
 * @returns {boolean}
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  connectDB,
  disconnectDB,
  isConnected,
  databaseConfig,
};