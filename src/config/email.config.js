// src/config/email.config.js

const nodemailer = require('nodemailer');

const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' || false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: {
    email: process.env.EMAIL_FROM || 'noreply@ite.edu.mx',
    name: process.env.EMAIL_FROM_NAME || 'TecNM Campus Ensenada',
  },
};

const createTransporter = () => {
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn('[EMAIL] Credenciales de email no configuradas. Los emails no se enviaran.');
    return null;
  }

  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

const verifyConnection = async () => {
  const transporter = createTransporter();
  
  if (!transporter) {
    return false;
  }

  try {
    await transporter.verify();
    console.log('[EMAIL] Conexion SMTP verificada exitosamente');
    return true;
  } catch (error) {
    console.error('[EMAIL] Error verificando conexion SMTP:', error.message);
    return false;
  }
};

module.exports = {
  emailConfig,
  createTransporter,
  verifyConnection,
};