// src/services/utils/exportTXT.service.js

const fs = require('fs').promises;
const path = require('path');

class ExportTXTService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../exports/txt');
  }

  /**
   * Exporta conversacion a formato TXT
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
        includeTokenStats = true,
        includeTimestamps = true,
        separator = '=' 
      } = options;

      await this.ensureOutputDir();

      const content = this.generateContent(conversation, messages, {
        includeMetadata,
        includeAttachments,
        includeTokenStats,
        includeTimestamps,
        separator
      });

      const fileName = this.generateFileName(conversation);
      const filePath = path.join(this.outputDir, fileName);

      await fs.writeFile(filePath, content, 'utf8');

      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        fileName,
        size: stats.size,
        sizeReadable: this.formatFileSize(stats.size),
        format: 'TXT'
      };
    } catch (error) {
      throw new Error(`Error exportando a TXT: ${error.message}`);
    }
  }

  /**
   * Genera contenido del archivo TXT
   * @param {Object} conversation - Conversacion
   * @param {Array} messages - Mensajes
   * @param {Object} options - Opciones
   * @returns {string} - Contenido TXT
   */
  generateContent(conversation, messages, options) {
    const { includeMetadata, includeAttachments, includeTokenStats, includeTimestamps, separator } = options;
    
    let content = '';
    const divider = separator.repeat(80);

    content += divider + '\n';
    content += this.centerText('CONVERSACION EXPORTADA', 80) + '\n';
    content += divider + '\n\n';

    content += `TITULO: ${conversation.title}\n\n`;

    if (conversation.tags && conversation.tags.length > 0) {
      content += `TAGS: ${conversation.tags.join(', ')}\n\n`;
    }

    if (includeMetadata) {
      content += this.generateMetadataSection(conversation);
    }

    content += divider + '\n';
    content += this.centerText('MENSAJES', 80) + '\n';
    content += divider + '\n\n';

    for (let i = 0; i < messages.length; i++) {
      content += this.generateMessageContent(messages[i], i + 1, {
        includeAttachments,
        includeTimestamps
      });
      content += '\n';
    }

    if (includeTokenStats && conversation.tokenUsage) {
      content += divider + '\n';
      content += this.centerText('ESTADISTICAS', 80) + '\n';
      content += divider + '\n\n';
      content += this.generateStatsSection(conversation, messages);
    }

    content += divider + '\n';
    content += this.centerText('FIN DE LA CONVERSACION', 80) + '\n';
    content += divider + '\n';
    content += `\nExportado el: ${new Date().toLocaleString('es-ES')}\n`;
    content += `ID de Conversacion: ${conversation._id}\n`;

    return content;
  }

  /**
   * Genera seccion de metadata
   * @param {Object} conversation - Conversacion
   * @returns {string} - Metadata formateada
   */
  generateMetadataSection(conversation) {
    let section = 'METADATA\n';
    section += '-'.repeat(80) + '\n\n';
    
    section += `ID de Conversacion: ${conversation._id}\n`;
    section += `Usuario ID: ${conversation.userId}\n`;
    section += `Fecha de creacion: ${new Date(conversation.createdAt).toLocaleString('es-ES')}\n`;
    section += `Ultima actualizacion: ${new Date(conversation.updatedAt).toLocaleString('es-ES')}\n`;
    
    if (conversation.tokenUsage) {
      section += `Tokens utilizados: ${conversation.tokenUsage.total.toLocaleString()}\n`;
      if (conversation.tokenUsage.estimatedCost) {
        section += `Costo estimado: $${conversation.tokenUsage.estimatedCost.toFixed(6)}\n`;
      }
    }

    section += '\n';
    return section;
  }

  /**
   * Genera contenido de un mensaje
   * @param {Object} message - Mensaje
   * @param {number} index - Numero del mensaje
   * @param {Object} options - Opciones
   * @returns {string} - Mensaje formateado
   */
  generateMessageContent(message, index, options) {
    const { includeAttachments, includeTimestamps } = options;
    
    let content = '';
    const roleLabel = message.role === 'user' ? 'USUARIO' : 'ASISTENTE';
    
    content += `[${index}] ${roleLabel}`;
    
    if (includeTimestamps) {
      const timestamp = new Date(message.createdAt).toLocaleString('es-ES');
      content += ` - ${timestamp}`;
    }
    
    content += '\n';
    content += '-'.repeat(80) + '\n';
    content += message.content + '\n';

    if (includeAttachments && message.attachments && message.attachments.length > 0) {
      content += '\n[ADJUNTOS]\n';
      for (const attachment of message.attachments) {
        content += `  - ${attachment.name} (${attachment.type})\n`;
      }
    }

    if (message.tokens) {
      content += `\n[Tokens: ${message.tokens}]\n`;
    }

    content += '\n';
    return content;
  }

  /**
   * Genera seccion de estadisticas
   * @param {Object} conversation - Conversacion
   * @param {Array} messages - Mensajes
   * @returns {string} - Estadisticas formateadas
   */
  generateStatsSection(conversation, messages) {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const totalMessages = messages.length;

    let section = '';
    section += `Total de mensajes: ${totalMessages}\n`;
    section += `Mensajes del usuario: ${userMessages}\n`;
    section += `Mensajes del asistente: ${assistantMessages}\n`;
    
    if (conversation.tokenUsage) {
      section += `\nTokens totales utilizados: ${conversation.tokenUsage.total.toLocaleString()}\n`;
      
      if (conversation.tokenUsage.estimatedCost) {
        section += `Costo estimado: $${conversation.tokenUsage.estimatedCost.toFixed(6)}\n`;
      }
    }

    const avgTokensPerMessage = messages.reduce((sum, m) => sum + (m.tokens || 0), 0) / totalMessages;
    section += `\nPromedio de tokens por mensaje: ${Math.round(avgTokensPerMessage)}\n`;

    return section + '\n';
  }

  /**
   * Exporta conversacion en formato Markdown
   * @param {Object} conversation - Conversacion
   * @param {Array} messages - Mensajes
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} - Informacion del archivo
   */
  async exportAsMarkdown(conversation, messages, options = {}) {
    try {
      const {
        includeMetadata = true,
        includeTokenStats = true
      } = options;

      await this.ensureOutputDir();

      let content = `# ${conversation.title}\n\n`;

      if (conversation.tags && conversation.tags.length > 0) {
        content += `**Tags:** ${conversation.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
      }

      if (includeMetadata) {
        content += `## Metadata\n\n`;
        content += `- **ID:** ${conversation._id}\n`;
        content += `- **Creada:** ${new Date(conversation.createdAt).toLocaleString('es-ES')}\n`;
        content += `- **Actualizada:** ${new Date(conversation.updatedAt).toLocaleString('es-ES')}\n\n`;
      }

      content += `## Mensajes\n\n`;

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const roleEmoji = message.role === 'user' ? '👤' : '🤖';
        const roleLabel = message.role === 'user' ? 'Usuario' : 'Asistente';

        content += `### ${roleEmoji} ${roleLabel} - Mensaje ${i + 1}\n\n`;
        content += `${message.content}\n\n`;

        if (message.attachments && message.attachments.length > 0) {
          content += `**Adjuntos:**\n`;
          for (const att of message.attachments) {
            content += `- ${att.name} (${att.type})\n`;
          }
          content += '\n';
        }

        content += '---\n\n';
      }

      if (includeTokenStats && conversation.tokenUsage) {
        content += `## Estadisticas\n\n`;
        content += `- **Total de mensajes:** ${messages.length}\n`;
        content += `- **Tokens totales:** ${conversation.tokenUsage.total.toLocaleString()}\n`;
        if (conversation.tokenUsage.estimatedCost) {
          content += `- **Costo estimado:** $${conversation.tokenUsage.estimatedCost.toFixed(6)}\n`;
        }
        content += '\n';
      }

      content += `---\n\n`;
      content += `*Exportado el ${new Date().toLocaleString('es-ES')}*\n`;

      const fileName = this.generateFileName(conversation, 'md');
      const filePath = path.join(this.outputDir, fileName);

      await fs.writeFile(filePath, content, 'utf8');

      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        fileName,
        size: stats.size,
        sizeReadable: this.formatFileSize(stats.size),
        format: 'Markdown'
      };
    } catch (error) {
      throw new Error(`Error exportando a Markdown: ${error.message}`);
    }
  }

  /**
   * Exporta solo los mensajes (sin metadata)
   * @param {Array} messages - Mensajes
   * @param {string} conversationTitle - Titulo de conversacion
   * @returns {Promise<Object>} - Informacion del archivo
   */
  async exportMessagesOnly(messages, conversationTitle) {
    try {
      await this.ensureOutputDir();

      let content = '';

      for (const message of messages) {
        const role = message.role === 'user' ? 'USUARIO' : 'ASISTENTE';
        content += `[${role}]\n`;
        content += `${message.content}\n\n`;
      }

      const timestamp = Date.now();
      const fileName = `messages_${timestamp}.txt`;
      const filePath = path.join(this.outputDir, fileName);

      await fs.writeFile(filePath, content, 'utf8');

      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        fileName,
        size: stats.size,
        sizeReadable: this.formatFileSize(stats.size)
      };
    } catch (error) {
      throw new Error(`Error exportando mensajes: ${error.message}`);
    }
  }

  /**
   * Centra texto en una linea
   * @param {string} text - Texto a centrar
   * @param {number} width - Ancho de la linea
   * @returns {string} - Texto centrado
   */
  centerText(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Genera nombre de archivo
   * @param {Object} conversation - Conversacion
   * @param {string} extension - Extension del archivo
   * @returns {string} - Nombre del archivo
   */
  generateFileName(conversation, extension = 'txt') {
    const timestamp = Date.now();
    const title = conversation.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    return `conversation_${title}_${timestamp}.${extension}`;
  }

  /**
   * Formatea tamano de archivo
   * @param {number} bytes - Tamano en bytes
   * @returns {string} - Tamano formateado
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
   * Lista archivos exportados
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
          sizeReadable: this.formatFileSize(stats.size),
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

module.exports = new ExportTXTService();