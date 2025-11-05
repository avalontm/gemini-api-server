// src/services/email/email.service.js

const { createTransporter, emailConfig } = require('../../config/email.config');

class EmailService {
  constructor() {
    this.transporter = createTransporter();
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter) {
      console.warn('[EMAIL] Transporter no configurado. Email no enviado a:', to);
      return {
        success: false,
        message: 'Servicio de email no configurado',
      };
    }

    try {
      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('[EMAIL] Email enviado exitosamente a:', to);
      console.log('[EMAIL] Message ID:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('[EMAIL] Error enviando email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendPasswordResetEmail(email, resetToken, nombreCompleto) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const subject = 'Recuperacion de Contrasena - TecNM Campus Ensenada';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .content {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
          }
          .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 25px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              TecNM Campus Ensenada
            </div>
            <h1 style="color: #1f2937; margin: 0;">Recuperacion de Contrasena</h1>
          </div>

          <div class="content">
            <p>Hola <strong>${nombreCompleto}</strong>,</p>
            
            <p>Hemos recibido una solicitud para restablecer la contrasena de tu cuenta en Gemini Chat TecNM.</p>
            
            <p>Si realizaste esta solicitud, haz clic en el siguiente boton para crear una nueva contrasena:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Restablecer Contrasena</a>
            </div>
            
            <p>O copia y pega el siguiente enlace en tu navegador:</p>
            <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px;">
              ${resetUrl}
            </p>

            <div class="warning">
              <strong>Importante:</strong> Este enlace expirara en 1 hora por razones de seguridad.
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6b7280;">
              Si no solicitaste restablecer tu contrasena, puedes ignorar este correo de forma segura. Tu contrasena no cambiara hasta que accedas al enlace y establezcas una nueva.
            </p>
          </div>

          <div class="footer">
            <p><strong>Tecnologico Nacional de Mexico</strong><br>Campus Ensenada</p>
            <p style="font-size: 12px;">
              Este es un correo automatico, por favor no respondas a este mensaje.
            </p>
            <p style="font-size: 12px;">
              Si tienes problemas, contacta a servicios escolares.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hola ${nombreCompleto},

      Hemos recibido una solicitud para restablecer la contrasena de tu cuenta en Gemini Chat TecNM.

      Si realizaste esta solicitud, visita el siguiente enlace para crear una nueva contrasena:
      ${resetUrl}

      Este enlace expirara en 1 hora por razones de seguridad.

      Si no solicitaste restablecer tu contrasena, puedes ignorar este correo de forma segura.

      Tecnologico Nacional de Mexico - Campus Ensenada
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordChangedEmail(email, nombreCompleto) {
    const subject = 'Contrasena Actualizada - TecNM Campus Ensenada';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .content {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .success-icon {
            text-align: center;
            font-size: 48px;
            margin: 20px 0;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              TecNM Campus Ensenada
            </div>
            <h1 style="color: #1f2937; margin: 0;">Contrasena Actualizada</h1>
          </div>

          <div class="content">
            <div class="success-icon">✓</div>
            
            <p>Hola <strong>${nombreCompleto}</strong>,</p>
            
            <p>Te confirmamos que tu contrasena ha sido actualizada exitosamente.</p>
            
            <p>Si realizaste este cambio, no necesitas hacer nada mas. Tu cuenta esta segura.</p>

            <div class="warning">
              <strong>¿No realizaste este cambio?</strong><br>
              Si no fuiste tu quien cambio la contrasena, contacta inmediatamente a servicios escolares del TecNM Campus Ensenada para proteger tu cuenta.
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Ir al Inicio de Sesion
              </a>
            </p>
          </div>

          <div class="footer">
            <p><strong>Tecnologico Nacional de Mexico</strong><br>Campus Ensenada</p>
            <p style="font-size: 12px;">
              Este es un correo automatico, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hola ${nombreCompleto},

      Te confirmamos que tu contrasena ha sido actualizada exitosamente.

      Si realizaste este cambio, no necesitas hacer nada mas.

      Si no fuiste tu quien cambio la contrasena, contacta inmediatamente a servicios escolares.

      Tecnologico Nacional de Mexico - Campus Ensenada
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email, nombreCompleto) {
    const subject = 'Bienvenido a Gemini Chat TecNM - Campus Ensenada';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .content {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              TecNM Campus Ensenada
            </div>
            <h1 style="color: #1f2937; margin: 0;">¡Bienvenido!</h1>
          </div>

          <div class="content">
            <p>Hola <strong>${nombreCompleto}</strong>,</p>
            
            <p>¡Bienvenido a Gemini Chat TecNM! Tu cuenta ha sido creada exitosamente.</p>
            
            <p>Ya puedes acceder a la plataforma y comenzar a usar todas las funcionalidades de IA que tenemos para ti.</p>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Iniciar Sesion
              </a>
            </p>
          </div>

          <div class="footer">
            <p><strong>Tecnologico Nacional de Mexico</strong><br>Campus Ensenada</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Hola ${nombreCompleto}, bienvenido a Gemini Chat TecNM!`,
    });
  }

  async sendVerificationEmail(email, verificationToken, nombreCompleto) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    
    const subject = 'Verifica tu cuenta - TecNM Campus Ensenada';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .content {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
          }
          .warning {
            background-color: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
          }
          .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 25px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              TecNM Campus Ensenada
            </div>
            <h1 style="color: #1f2937; margin: 0;">Verifica tu Cuenta</h1>
          </div>

          <div class="content">
            <p>Hola <strong>${nombreCompleto}</strong>,</p>
            
            <p>Gracias por registrarte en Gemini Chat TecNM. Para completar tu registro y comenzar a usar la plataforma, necesitas verificar tu cuenta.</p>
            
            <p>Haz clic en el siguiente boton para verificar tu correo electronico:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verificar mi Cuenta</a>
            </div>
            
            <p>O copia y pega el siguiente enlace en tu navegador:</p>
            <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px;">
              ${verificationUrl}
            </p>

            <div class="warning">
              <strong>Importante:</strong> Este enlace expirara en 24 horas. Si no verificas tu cuenta en este tiempo, tendras que registrarte nuevamente.
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6b7280;">
              Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
            </p>
          </div>

          <div class="footer">
            <p><strong>Tecnologico Nacional de Mexico</strong><br>Campus Ensenada</p>
            <p style="font-size: 12px;">
              Este es un correo automatico, por favor no respondas a este mensaje.
            </p>
            <p style="font-size: 12px;">
              Si tienes problemas, contacta a servicios escolares.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hola ${nombreCompleto},

      Gracias por registrarte en Gemini Chat TecNM. Para completar tu registro, verifica tu cuenta visitando el siguiente enlace:
      ${verificationUrl}

      Este enlace expirara en 24 horas.

      Si no creaste esta cuenta, puedes ignorar este correo de forma segura.

      Tecnologico Nacional de Mexico - Campus Ensenada
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}

module.exports = new EmailService();