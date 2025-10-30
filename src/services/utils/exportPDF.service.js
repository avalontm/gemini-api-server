// src/services/utils/exportPDF.service.js

const fs = require('fs').promises;
const path = require('path');

class ExportPDFService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../exports/pdf');
  }

  /**
   * Exporta conversacion a PDF
   * @param {Object} conversation - Datos de la conversacion
   * @param {Array} messages - Array de mensajes
   * @param {Object} options - Opciones de exportacion
   * @returns {Promise<Object>} - Informacion del archivo generado
   */
  async exportConversation(conversation, messages, options = {}) {
    try {
      const {
        includeMetadata = true,
        includeAttachments = true,
        includeTokenStats = true
      } = options;

      await this.ensureOutputDir();

      const html = this.generateHTML(conversation, messages, {
        includeMetadata,
        includeAttachments,
        includeTokenStats
      });

      const fileName = this.generateFileName(conversation);
      const filePath = path.join(this.outputDir, fileName);

      await fs.writeFile(filePath, html, 'utf8');

      return {
        success: true,
        filePath,
        fileName,
        size: (await fs.stat(filePath)).size,
        note: 'HTML generado. Para convertir a PDF real, se requiere libreria como puppeteer o pdfkit'
      };
    } catch (error) {
      throw new Error(`Error exportando a PDF: ${error.message}`);
    }
  }

  /**
   * Genera HTML de la conversacion
   * @param {Object} conversation - Conversacion
   * @param {Array} messages - Mensajes
   * @param {Object} options - Opciones
   * @returns {string} - HTML generado
   */
  generateHTML(conversation, messages, options) {
    const { includeMetadata, includeAttachments, includeTokenStats } = options;

    let html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(conversation.title)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .metadata {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .metadata-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        
        .metadata-item:last-child {
            border-bottom: none;
        }
        
        .metadata-label {
            font-weight: 600;
            color: #667eea;
        }
        
        .message {
            background: white;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .message-user {
            border-left: 4px solid #667eea;
        }
        
        .message-assistant {
            border-left: 4px solid #764ba2;
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .message-role {
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
        }
        
        .role-user {
            color: #667eea;
        }
        
        .role-assistant {
            color: #764ba2;
        }
        
        .message-time {
            font-size: 12px;
            color: #999;
        }
        
        .message-content {
            color: #333;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .attachments {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        
        .attachment {
            display: inline-block;
            padding: 5px 10px;
            background: #f0f0f0;
            border-radius: 4px;
            margin-right: 10px;
            font-size: 12px;
            color: #666;
        }
        
        .stats {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stats h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        
        .stat-item:last-child {
            border-bottom: none;
        }
        
        .tags {
            margin-top: 10px;
        }
        
        .tag {
            display: inline-block;
            padding: 4px 12px;
            background: #667eea;
            color: white;
            border-radius: 20px;
            font-size: 12px;
            margin-right: 8px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            color: #999;
            font-size: 12px;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .message, .metadata, .stats {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.escapeHtml(conversation.title)}</h1>
        ${conversation.tags && conversation.tags.length > 0 ? `
        <div class="tags">
            ${conversation.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
        </div>
        ` : ''}
    </div>
`;

    if (includeMetadata) {
      html += this.generateMetadataSection(conversation);
    }

    html += `
    <div class="messages">
`;

    for (const message of messages) {
      html += this.generateMessageHTML(message, includeAttachments);
    }

    html += `
    </div>
`;

    if (includeTokenStats && conversation.tokenUsage) {
      html += this.generateStatsSection(conversation, messages);
    }

    html += `
    <div class="footer">
        <p>Exportado el ${new Date().toLocaleString('es-ES')}</p>
        <p>Gemini API Server - Conversacion ID: ${conversation._id}</p>
    </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Genera seccion de metadata
   * @param {Object} conversation - Conversacion
   * @returns {string} - HTML de metadata
   */
  generateMetadataSection(conversation) {
    return `
    <div class="metadata">
        <div class="metadata-item">
            <span class="metadata-label">ID de Conversacion:</span>
            <span>${conversation._id}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Creada:</span>
            <span>${new Date(conversation.createdAt).toLocaleString('es-ES')}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Ultima actualizacion:</span>
            <span>${new Date(conversation.updatedAt).toLocaleString('es-ES')}</span>
        </div>
        ${conversation.tokenUsage ? `
        <div class="metadata-item">
            <span class="metadata-label">Tokens utilizados:</span>
            <span>${conversation.tokenUsage.total.toLocaleString()}</span>
        </div>
        ` : ''}
    </div>
`;
  }

  /**
   * Genera HTML de un mensaje
   * @param {Object} message - Mensaje
   * @param {boolean} includeAttachments - Incluir adjuntos
   * @returns {string} - HTML del mensaje
   */
  generateMessageHTML(message, includeAttachments) {
    const roleClass = message.role === 'user' ? 'message-user' : 'message-assistant';
    const roleLabel = message.role === 'user' ? 'Usuario' : 'Asistente';
    const roleLabelClass = message.role === 'user' ? 'role-user' : 'role-assistant';

    let html = `
    <div class="message ${roleClass}">
        <div class="message-header">
            <span class="message-role ${roleLabelClass}">${roleLabel}</span>
            <span class="message-time">${new Date(message.createdAt).toLocaleString('es-ES')}</span>
        </div>
        <div class="message-content">${this.escapeHtml(message.content)}</div>
`;

    if (includeAttachments && message.attachments && message.attachments.length > 0) {
      html += `
        <div class="attachments">
            <strong>Adjuntos:</strong><br>
`;
      for (const attachment of message.attachments) {
        html += `
            <span class="attachment">${this.escapeHtml(attachment.name)} (${attachment.type})</span>
`;
      }
      html += `
        </div>
`;
    }

    html += `
    </div>
`;

    return html;
  }

  /**
   * Genera seccion de estadisticas
   * @param {Object} conversation - Conversacion
   * @param {Array} messages - Mensajes
   * @returns {string} - HTML de estadisticas
   */
  generateStatsSection(conversation, messages) {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const totalMessages = messages.length;

    return `
    <div class="stats">
        <h3>Estadisticas</h3>
        <div class="stat-item">
            <span>Total de mensajes:</span>
            <span>${totalMessages}</span>
        </div>
        <div class="stat-item">
            <span>Mensajes del usuario:</span>
            <span>${userMessages}</span>
        </div>
        <div class="stat-item">
            <span>Mensajes del asistente:</span>
            <span>${assistantMessages}</span>
        </div>
        ${conversation.tokenUsage ? `
        <div class="stat-item">
            <span>Tokens totales:</span>
            <span>${conversation.tokenUsage.total.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span>Costo estimado:</span>
            <span>$${conversation.tokenUsage.estimatedCost?.toFixed(6) || '0.000000'}</span>
        </div>
        ` : ''}
    </div>
`;
  }

  /**
   * Escapa HTML para prevenir XSS
   * @param {string} text - Texto a escapar
   * @returns {string} - Texto escapado
   */
  escapeHtml(text) {
    if (!text) return '';
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Genera nombre de archivo
   * @param {Object} conversation - Conversacion
   * @returns {string} - Nombre del archivo
   */
  generateFileName(conversation) {
    const timestamp = Date.now();
    const title = conversation.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    return `conversation_${title}_${timestamp}.html`;
  }

  /**
   * Asegura que existe el directorio de salida
   * @returns {Promise<void>}
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Error creando directorio: ${error.message}`);
    }
  }

  /**
   * Elimina archivos antiguos de exportacion
   * @param {number} daysOld - Dias de antiguedad
   * @returns {Promise<Object>} - Resultado de limpieza
   */
  async cleanOldExports(daysOld = 7) {
    try {
      await this.ensureOutputDir();
      const files = await fs.readdir(this.outputDir);
      
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return {
        success: true,
        deletedCount,
        remainingFiles: files.length - deletedCount
      };
    } catch (error) {
      throw new Error(`Error limpiando exportaciones: ${error.message}`);
    }
  }

  /**
   * Obtiene lista de archivos exportados
   * @returns {Promise<Array>} - Lista de archivos
   */
  async listExports() {
    try {
      await this.ensureOutputDir();
      const files = await fs.readdir(this.outputDir);
      
      const exports = [];

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);

        exports.push({
          fileName: file,
          filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }

      exports.sort((a, b) => b.modified - a.modified);

      return exports;
    } catch (error) {
      throw new Error(`Error listando exportaciones: ${error.message}`);
    }
  }

  /**
   * Elimina un archivo de exportacion
   * @param {string} fileName - Nombre del archivo
   * @returns {Promise<boolean>} - true si se elimino
   */
  async deleteExport(fileName) {
    try {
      const filePath = path.join(this.outputDir, fileName);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error eliminando exportacion: ${error.message}`);
      return false;
    }
  }
}

module.exports = new ExportPDFService();