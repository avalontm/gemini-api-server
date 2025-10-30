// src/services/processing/textFormatter.service.js

class TextFormatterService {
  /**
   * Formatea respuesta de Gemini para mejor legibilidad
   * @param {string} text - Texto a formatear
   * @param {Object} options - Opciones de formato
   * @returns {string} - Texto formateado
   */
  formatResponse(text, options = {}) {
    try {
      const {
        removeExtraSpaces = true,
        normalizeLineBreaks = true,
        trimText = true,
        capitalizeFirst = false
      } = options;

      let formatted = text;

      if (trimText) {
        formatted = formatted.trim();
      }

      if (removeExtraSpaces) {
        formatted = formatted.replace(/ +/g, ' ');
      }

      if (normalizeLineBreaks) {
        formatted = formatted.replace(/\r\n/g, '\n');
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
      }

      if (capitalizeFirst && formatted.length > 0) {
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }

      return formatted;
    } catch (error) {
      throw new Error(`Error formateando respuesta: ${error.message}`);
    }
  }

  /**
   * Convierte texto a formato Markdown
   * @param {string} text - Texto a convertir
   * @returns {string} - Texto en formato Markdown
   */
  toMarkdown(text) {
    try {
      let markdown = text;

      markdown = markdown.replace(/^# (.+)$/gm, '# $1');
      markdown = markdown.replace(/^## (.+)$/gm, '## $1');
      markdown = markdown.replace(/^### (.+)$/gm, '### $1');

      markdown = markdown.replace(/\*\*(.+?)\*\*/g, '**$1**');
      markdown = markdown.replace(/\*(.+?)\*/g, '*$1*');

      markdown = markdown.replace(/```(\w+)?\n([\s\S]+?)```/g, '```$1\n$2```');

      return markdown;
    } catch (error) {
      throw new Error(`Error convirtiendo a Markdown: ${error.message}`);
    }
  }

  /**
   * Convierte texto Markdown a HTML
   * @param {string} markdown - Texto Markdown
   * @returns {string} - HTML generado
   */
  markdownToHTML(markdown) {
    try {
      let html = markdown;

      html = html.replace(/### (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/## (.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/# (.+)$/gm, '<h1>$1</h1>');

      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

      html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

      html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code class="language-$1">$2</code></pre>');

      html = html.replace(/`(.+?)`/g, '<code>$1</code>');

      html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

      html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');

      html = html.replace(/\n\n/g, '</p><p>');
      html = '<p>' + html + '</p>';

      return html;
    } catch (error) {
      throw new Error(`Error convirtiendo Markdown a HTML: ${error.message}`);
    }
  }

  /**
   * Limpia texto eliminando caracteres especiales
   * @param {string} text - Texto a limpiar
   * @param {Object} options - Opciones de limpieza
   * @returns {string} - Texto limpio
   */
  sanitize(text, options = {}) {
    try {
      const {
        removeEmojis = false,
        removeHTML = true,
        removeURLs = false,
        removeSpecialChars = false
      } = options;

      let sanitized = text;

      if (removeHTML) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      }

      if (removeEmojis) {
        sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
        sanitized = sanitized.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
        sanitized = sanitized.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
        sanitized = sanitized.replace(/[\u{2600}-\u{26FF}]/gu, '');
      }

      if (removeURLs) {
        sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '');
      }

      if (removeSpecialChars) {
        sanitized = sanitized.replace(/[^\w\s.,!?-]/g, '');
      }

      return sanitized.trim();
    } catch (error) {
      throw new Error(`Error sanitizando texto: ${error.message}`);
    }
  }

  /**
   * Trunca texto a una longitud maxima
   * @param {string} text - Texto a truncar
   * @param {number} maxLength - Longitud maxima
   * @param {string} suffix - Sufijo al truncar (default: '...')
   * @returns {string} - Texto truncado
   */
  truncate(text, maxLength = 100, suffix = '...') {
    try {
      if (!text || text.length <= maxLength) {
        return text;
      }

      const truncated = text.substring(0, maxLength - suffix.length);
      const lastSpace = truncated.lastIndexOf(' ');

      if (lastSpace > 0) {
        return truncated.substring(0, lastSpace) + suffix;
      }

      return truncated + suffix;
    } catch (error) {
      throw new Error(`Error truncando texto: ${error.message}`);
    }
  }

  /**
   * Extrae extracto de texto relevante
   * @param {string} text - Texto completo
   * @param {number} length - Longitud del extracto
   * @returns {string} - Extracto
   */
  extractExcerpt(text, length = 200) {
    try {
      const cleaned = this.sanitize(text, { removeHTML: true, removeEmojis: true });
      
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
      
      let excerpt = '';
      for (const sentence of sentences) {
        if ((excerpt + sentence).length <= length) {
          excerpt += sentence;
        } else {
          break;
        }
      }

      if (!excerpt) {
        excerpt = this.truncate(cleaned, length);
      }

      return excerpt.trim();
    } catch (error) {
      throw new Error(`Error extrayendo extracto: ${error.message}`);
    }
  }

  /**
   * Divide texto en parrafos
   * @param {string} text - Texto a dividir
   * @returns {Array<string>} - Array de parrafos
   */
  splitIntoParagraphs(text) {
    try {
      const paragraphs = text
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      return paragraphs;
    } catch (error) {
      throw new Error(`Error dividiendo en parrafos: ${error.message}`);
    }
  }

  /**
   * Divide texto en oraciones
   * @param {string} text - Texto a dividir
   * @returns {Array<string>} - Array de oraciones
   */
  splitIntoSentences(text) {
    try {
      const sentences = text
        .match(/[^.!?]+[.!?]+/g)
        ?.map(s => s.trim())
        .filter(s => s.length > 0) || [];

      return sentences;
    } catch (error) {
      throw new Error(`Error dividiendo en oraciones: ${error.message}`);
    }
  }

  /**
   * Cuenta palabras en un texto
   * @param {string} text - Texto a analizar
   * @returns {number} - Cantidad de palabras
   */
  countWords(text) {
    try {
      if (!text || text.trim().length === 0) {
        return 0;
      }

      const words = text.trim().split(/\s+/);
      return words.length;
    } catch (error) {
      throw new Error(`Error contando palabras: ${error.message}`);
    }
  }

  /**
   * Obtiene estadisticas del texto
   * @param {string} text - Texto a analizar
   * @returns {Object} - Estadisticas del texto
   */
  getTextStats(text) {
    try {
      const characters = text.length;
      const charactersNoSpaces = text.replace(/\s/g, '').length;
      const words = this.countWords(text);
      const sentences = this.splitIntoSentences(text).length;
      const paragraphs = this.splitIntoParagraphs(text).length;
      const lines = text.split('\n').length;

      const avgWordLength = charactersNoSpaces / words || 0;
      const avgWordsPerSentence = words / sentences || 0;
      const avgSentencesPerParagraph = sentences / paragraphs || 0;

      return {
        characters,
        charactersNoSpaces,
        words,
        sentences,
        paragraphs,
        lines,
        averages: {
          wordLength: Math.round(avgWordLength * 10) / 10,
          wordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
          sentencesPerParagraph: Math.round(avgSentencesPerParagraph * 10) / 10
        }
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadisticas: ${error.message}`);
    }
  }

  /**
   * Normaliza espacios en blanco
   * @param {string} text - Texto a normalizar
   * @returns {string} - Texto normalizado
   */
  normalizeWhitespace(text) {
    try {
      let normalized = text;

      normalized = normalized.replace(/\t/g, ' ');

      normalized = normalized.replace(/ +/g, ' ');

      normalized = normalized.replace(/\n{3,}/g, '\n\n');

      normalized = normalized.trim();

      return normalized;
    } catch (error) {
      throw new Error(`Error normalizando espacios: ${error.message}`);
    }
  }

  /**
   * Convierte texto a formato para exportacion
   * @param {string} text - Texto a formatear
   * @param {string} format - Formato destino (txt, md, html)
   * @returns {string} - Texto formateado
   */
  formatForExport(text, format = 'txt') {
    try {
      let formatted = text;

      switch (format.toLowerCase()) {
        case 'txt':
          formatted = this.sanitize(text, { removeHTML: true });
          formatted = this.normalizeWhitespace(formatted);
          break;

        case 'md':
        case 'markdown':
          formatted = this.toMarkdown(text);
          break;

        case 'html':
          formatted = this.markdownToHTML(text);
          break;

        default:
          formatted = text;
      }

      return formatted;
    } catch (error) {
      throw new Error(`Error formateando para exportacion: ${error.message}`);
    }
  }

  /**
   * Formatea codigo dentro del texto
   * @param {string} text - Texto con bloques de codigo
   * @returns {string} - Texto con codigo formateado
   */
  formatCodeBlocks(text) {
    try {
      let formatted = text;

      formatted = formatted.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
        const trimmedCode = code.trim();
        const language = lang || 'plaintext';
        return `\`\`\`${language}\n${trimmedCode}\n\`\`\``;
      });

      formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
        return `\`${code.trim()}\``;
      });

      return formatted;
    } catch (error) {
      throw new Error(`Error formateando bloques de codigo: ${error.message}`);
    }
  }

  /**
   * Convierte primera letra de cada palabra a mayuscula
   * @param {string} text - Texto a convertir
   * @returns {string} - Texto en title case
   */
  toTitleCase(text) {
    try {
      return text.replace(/\w\S*/g, (word) => {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
      });
    } catch (error) {
      throw new Error(`Error convirtiendo a title case: ${error.message}`);
    }
  }

  /**
   * Remueve acentos y diacriticos
   * @param {string} text - Texto con acentos
   * @returns {string} - Texto sin acentos
   */
  removeAccents(text) {
    try {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (error) {
      throw new Error(`Error removiendo acentos: ${error.message}`);
    }
  }

  /**
   * Genera slug desde texto
   * @param {string} text - Texto a convertir
   * @returns {string} - Slug generado
   */
  generateSlug(text) {
    try {
      let slug = text.toLowerCase();
      slug = this.removeAccents(slug);
      slug = slug.replace(/[^\w\s-]/g, '');
      slug = slug.replace(/\s+/g, '-');
      slug = slug.replace(/-+/g, '-');
      slug = slug.trim();

      return slug;
    } catch (error) {
      throw new Error(`Error generando slug: ${error.message}`);
    }
  }
}

module.exports = new TextFormatterService();