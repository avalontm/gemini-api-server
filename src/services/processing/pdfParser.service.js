// src/services/processing/pdfParser.service.js

const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const { MAX_FILE_SIZE } = require('../../config/constants');

class PDFParserService {
  /**
   * Extrae texto de un archivo PDF
   * @param {string} filePath - Ruta del archivo PDF
   * @returns {Promise<Object>} - Texto extraido y metadata
   */
  async extractText(filePath) {
    try {
      await this.validatePDFFile(filePath);

      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        text: data.text,
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
        filePath,
        extractedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Error extrayendo texto del PDF: ${error.message}`);
    }
  }

  /**
   * Extrae texto de una pagina especifica
   * @param {string} filePath - Ruta del archivo PDF
   * @param {number} pageNumber - Numero de pagina (inicia en 1)
   * @returns {Promise<Object>} - Texto de la pagina
   */
  async extractPageText(filePath, pageNumber) {
    try {
      await this.validatePDFFile(filePath);

      if (!pageNumber || pageNumber < 1) {
        throw new Error('Numero de pagina invalido');
      }

      const dataBuffer = await fs.readFile(filePath);
      
      const options = {
        pagerender: (pageData) => {
          if (pageData.pageNumber === pageNumber) {
            return pageData.getTextContent();
          }
          return null;
        }
      };

      const data = await pdfParse(dataBuffer, options);

      if (pageNumber > data.numpages) {
        throw new Error(`Pagina ${pageNumber} no existe. El PDF tiene ${data.numpages} paginas`);
      }

      return {
        text: data.text,
        pageNumber,
        totalPages: data.numpages,
        filePath
      };
    } catch (error) {
      throw new Error(`Error extrayendo texto de pagina: ${error.message}`);
    }
  }

  /**
   * Extrae texto de un rango de paginas
   * @param {string} filePath - Ruta del archivo PDF
   * @param {number} startPage - Pagina inicial (inicia en 1)
   * @param {number} endPage - Pagina final (inclusive)
   * @returns {Promise<Object>} - Texto extraido del rango
   */
  async extractPageRange(filePath, startPage, endPage) {
    try {
      await this.validatePDFFile(filePath);

      if (!startPage || !endPage || startPage < 1 || endPage < startPage) {
        throw new Error('Rango de paginas invalido');
      }

      const dataBuffer = await fs.readFile(filePath);
      const fullData = await pdfParse(dataBuffer);

      if (endPage > fullData.numpages) {
        throw new Error(`Pagina final ${endPage} excede el total de paginas (${fullData.numpages})`);
      }

      const options = {
        pagerender: (pageData) => {
          if (pageData.pageNumber >= startPage && pageData.pageNumber <= endPage) {
            return pageData.getTextContent();
          }
          return null;
        }
      };

      const data = await pdfParse(dataBuffer, options);

      return {
        text: data.text,
        startPage,
        endPage,
        pagesExtracted: endPage - startPage + 1,
        totalPages: fullData.numpages,
        filePath
      };
    } catch (error) {
      throw new Error(`Error extrayendo rango de paginas: ${error.message}`);
    }
  }

  /**
   * Obtiene metadata del PDF sin extraer texto
   * @param {string} filePath - Ruta del archivo PDF
   * @returns {Promise<Object>} - Metadata del PDF
   */
  async getMetadata(filePath) {
    try {
      await this.validatePDFFile(filePath);

      const dataBuffer = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);
      
      const options = {
        max: 0
      };

      const data = await pdfParse(dataBuffer, options);

      return {
        fileName: path.basename(filePath),
        filePath,
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
        fileSize: stats.size,
        fileSizeReadable: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Error obteniendo metadata del PDF: ${error.message}`);
    }
  }

  /**
   * Valida archivo PDF
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>} - true si es valido
   */
  async validatePDFFile(filePath) {
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('El archivo PDF no existe');
      }

      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        throw new Error('El archivo PDF esta vacio');
      }

      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo excede el tamano maximo permitido (${this.formatFileSize(MAX_FILE_SIZE)})`);
      }

      const extension = path.extname(filePath).toLowerCase();
      if (extension !== '.pdf') {
        throw new Error('El archivo no es un PDF valido');
      }

      const buffer = await fs.readFile(filePath);
      const header = buffer.toString('utf8', 0, 5);
      
      if (!header.startsWith('%PDF-')) {
        throw new Error('El archivo no tiene un header PDF valido');
      }

      return true;
    } catch (error) {
      throw new Error(`Validacion de PDF fallida: ${error.message}`);
    }
  }

  /**
   * Prepara PDF para analisis con Gemini
   * @param {string} filePath - Ruta del archivo PDF
   * @param {Object} options - Opciones de preparacion
   * @param {number} options.maxPages - Maximo de paginas a extraer
   * @param {boolean} options.includeMetadata - Incluir metadata
   * @returns {Promise<Object>} - Datos preparados para Gemini
   */
  async prepareForGemini(filePath, options = {}) {
    try {
      const { maxPages = 50, includeMetadata = true } = options;

      await this.validatePDFFile(filePath);

      const metadata = await this.getMetadata(filePath);

      if (metadata.pages > maxPages) {
        throw new Error(`El PDF tiene ${metadata.pages} paginas. Maximo permitido: ${maxPages}`);
      }

      const extracted = await this.extractText(filePath);

      const result = {
        text: extracted.text,
        pages: extracted.pages,
        filePath
      };

      if (includeMetadata) {
        result.metadata = {
          fileName: metadata.fileName,
          fileSize: metadata.fileSizeReadable,
          pdfInfo: extracted.info,
          pdfMetadata: extracted.metadata,
          version: extracted.version
        };
      }

      return result;
    } catch (error) {
      throw new Error(`Error preparando PDF para Gemini: ${error.message}`);
    }
  }

  /**
   * Divide texto largo en chunks
   * @param {string} text - Texto a dividir
   * @param {number} maxChunkSize - Tamano maximo por chunk (caracteres)
   * @returns {Array<string>} - Array de chunks
   */
  splitIntoChunks(text, maxChunkSize = 30000) {
    const chunks = [];
    let currentChunk = '';

    const paragraphs = text.split('\n\n');

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= maxChunkSize) {
        currentChunk += paragraph + '\n\n';
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        if (paragraph.length <= maxChunkSize) {
          currentChunk = paragraph + '\n\n';
        } else {
          const words = paragraph.split(' ');
          currentChunk = '';
          
          for (const word of words) {
            if ((currentChunk + word).length <= maxChunkSize) {
              currentChunk += word + ' ';
            } else {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
              }
              currentChunk = word + ' ';
            }
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Extrae resumen de informacion del PDF
   * @param {string} filePath - Ruta del archivo PDF
   * @returns {Promise<Object>} - Resumen de informacion
   */
  async getSummary(filePath) {
    try {
      const metadata = await this.getMetadata(filePath);
      const extracted = await this.extractText(filePath);

      const words = extracted.text.split(/\s+/).length;
      const characters = extracted.text.length;
      const averageWordsPerPage = Math.round(words / metadata.pages);

      return {
        fileName: metadata.fileName,
        pages: metadata.pages,
        fileSize: metadata.fileSizeReadable,
        words,
        characters,
        averageWordsPerPage,
        textPreview: extracted.text.substring(0, 500) + '...',
        info: metadata.info,
        version: metadata.version
      };
    } catch (error) {
      throw new Error(`Error obteniendo resumen: ${error.message}`);
    }
  }

  /**
   * Busca texto especifico en el PDF
   * @param {string} filePath - Ruta del archivo PDF
   * @param {string} searchText - Texto a buscar
   * @param {boolean} caseSensitive - Busqueda sensible a mayusculas
   * @returns {Promise<Object>} - Resultados de busqueda
   */
  async searchText(filePath, searchText, caseSensitive = false) {
    try {
      if (!searchText) {
        throw new Error('Texto de busqueda requerido');
      }

      const extracted = await this.extractText(filePath);
      
      const text = caseSensitive ? extracted.text : extracted.text.toLowerCase();
      const search = caseSensitive ? searchText : searchText.toLowerCase();

      const occurrences = [];
      let index = 0;

      while ((index = text.indexOf(search, index)) !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + search.length + 50);
        const context = extracted.text.substring(start, end);

        occurrences.push({
          position: index,
          context: context,
          matchedText: extracted.text.substring(index, index + search.length)
        });

        index += search.length;
      }

      return {
        searchText,
        caseSensitive,
        found: occurrences.length > 0,
        occurrences: occurrences.length,
        matches: occurrences,
        filePath
      };
    } catch (error) {
      throw new Error(`Error buscando texto: ${error.message}`);
    }
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
   * Elimina archivo PDF temporal
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>} - true si se elimino correctamente
   */
  async deletePDFFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error eliminando archivo PDF: ${error.message}`);
      return false;
    }
  }
}

module.exports = new PDFParserService();