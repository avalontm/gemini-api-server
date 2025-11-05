// src/services/utils/markdownProcessor.service.js

const logger = require('../../utils/logger');

class MarkdownProcessorService {
  /**
   * Procesa y limpia el contenido markdown generado por Gemini
   * @param {string} content - Contenido markdown a procesar
   * @returns {string} - Contenido procesado
   */
  process(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    let processed = content;
    
    try {
      processed = this.fixMalformedTables(processed);
      processed = this.removeExtraTableSeparators(processed);
      processed = this.normalizeTableSpacing(processed);
      processed = this.fixTableColumnCount(processed);
      
      logger.debug('Contenido markdown procesado exitosamente', {
        originalLength: content.length,
        processedLength: processed.length
      });
    } catch (error) {
      logger.error('Error procesando markdown:', error);
      return content;
    }

    return processed;
  }

  /**
   * Corrige tablas mal formateadas
   * Elimina lineas de separadores duplicadas o incorrectas
   * @param {string} content - Contenido a procesar
   * @returns {string} - Contenido corregido
   */
  fixMalformedTables(content) {
    const lines = content.split('\n');
    const cleanedLines = [];
    let previousWasSeparator = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detectar linea de separador de tabla
      const isSeparatorLine = this.isTableSeparatorLine(line);
      
      // Si la linea actual es separador y la anterior tambien, omitir
      if (isSeparatorLine && previousWasSeparator) {
        logger.debug('Removiendo separador duplicado', { line });
        continue;
      }
      
      cleanedLines.push(lines[i]);
      previousWasSeparator = isSeparatorLine;
    }

    return cleanedLines.join('\n');
  }

  /**
   * Detecta si una linea es un separador de tabla
   * @param {string} line - Linea a verificar
   * @returns {boolean} - true si es separador
   */
  isTableSeparatorLine(line) {
    if (!line || !line.includes('|')) {
      return false;
    }

    // Remover espacios y verificar si solo contiene pipes y guiones
    const cleaned = line.trim().replace(/\s/g, '');
    
    // Debe empezar y terminar con pipe
    if (!cleaned.startsWith('|') || !cleaned.endsWith('|')) {
      return false;
    }

    // Debe contener solo pipes, guiones y opcionalmente dos puntos (para alineacion)
    return /^\|[\-:|]+\|$/.test(cleaned);
  }

  /**
   * Remueve separadores de tabla adicionales
   * Gemini a veces genera |---|---|---|---|---| con pipes de mas
   * @param {string} content - Contenido a procesar
   * @returns {string} - Contenido corregido
   */
  removeExtraTableSeparators(content) {
    const lines = content.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevLine = i > 0 ? lines[i - 1] : null;
      const nextLine = i < lines.length - 1 ? lines[i + 1] : null;

      // Si es una linea de separador
      if (this.isTableSeparatorLine(line)) {
        // Verificar si la linea anterior es un encabezado de tabla
        const prevIsHeader = prevLine && this.isTableHeaderLine(prevLine);
        
        // Verificar si la linea siguiente es una fila de datos
        const nextIsData = nextLine && this.isTableDataLine(nextLine);
        
        // Solo mantener el separador si esta entre header y datos
        if (prevIsHeader && nextIsData) {
          // Corregir el separador para que coincida con el numero de columnas
          const headerColumns = this.countTableColumns(prevLine);
          const correctedSeparator = this.createTableSeparator(headerColumns);
          processedLines.push(correctedSeparator);
          continue;
        }
        
        // Si no cumple las condiciones, omitir esta linea
        logger.debug('Removiendo separador mal ubicado', { line });
        continue;
      }

      processedLines.push(line);
    }

    return processedLines.join('\n');
  }

  /**
   * Detecta si una linea es un encabezado de tabla
   * @param {string} line - Linea a verificar
   * @returns {boolean} - true si es encabezado
   */
  isTableHeaderLine(line) {
    if (!line || !line.includes('|')) {
      return false;
    }

    const trimmed = line.trim();
    
    // Debe empezar y terminar con pipe
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      return false;
    }

    // No debe ser una linea de separador
    if (this.isTableSeparatorLine(line)) {
      return false;
    }

    // Debe tener al menos 2 columnas
    const columns = this.countTableColumns(line);
    return columns >= 2;
  }

  /**
   * Detecta si una linea es una fila de datos de tabla
   * @param {string} line - Linea a verificar
   * @returns {boolean} - true si es fila de datos
   */
  isTableDataLine(line) {
    // Similar a isTableHeaderLine
    return this.isTableHeaderLine(line);
  }

  /**
   * Cuenta el numero de columnas en una linea de tabla
   * @param {string} line - Linea de tabla
   * @returns {number} - Numero de columnas
   */
  countTableColumns(line) {
    if (!line || !line.includes('|')) {
      return 0;
    }

    // Remover pipes al inicio y final, luego contar los pipes restantes
    const trimmed = line.trim();
    let cleaned = trimmed;
    
    if (cleaned.startsWith('|')) {
      cleaned = cleaned.substring(1);
    }
    if (cleaned.endsWith('|')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }

    // Contar pipes restantes y sumar 1
    const pipeCount = (cleaned.match(/\|/g) || []).length;
    return pipeCount + 1;
  }

  /**
   * Crea una linea de separador de tabla
   * @param {number} columnCount - Numero de columnas
   * @returns {string} - Linea de separador
   */
  createTableSeparator(columnCount) {
    if (columnCount < 1) {
      return '|---|';
    }

    const separators = Array(columnCount).fill('---');
    return '| ' + separators.join(' | ') + ' |';
  }

  /**
   * Normaliza el espaciado en las tablas
   * Asegura que haya espacios alrededor del contenido de cada celda
   * @param {string} content - Contenido a procesar
   * @returns {string} - Contenido normalizado
   */
  normalizeTableSpacing(content) {
    const lines = content.split('\n');
    const processedLines = [];

    for (const line of lines) {
      // Solo procesar lineas que parecen ser parte de una tabla
      if (this.isTableLine(line)) {
        const normalized = this.normalizeTableLine(line);
        processedLines.push(normalized);
      } else {
        processedLines.push(line);
      }
    }

    return processedLines.join('\n');
  }

  /**
   * Detecta si una linea es parte de una tabla
   * @param {string} line - Linea a verificar
   * @returns {boolean} - true si es parte de tabla
   */
  isTableLine(line) {
    if (!line || !line.includes('|')) {
      return false;
    }

    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
  }

  /**
   * Normaliza el espaciado de una linea de tabla
   * @param {string} line - Linea a normalizar
   * @returns {string} - Linea normalizada
   */
  normalizeTableLine(line) {
    const trimmed = line.trim();
    
    // Separar por pipes
    let parts = trimmed.split('|');
    
    // Remover primer y ultimo elemento si estan vacios (debido a pipes al inicio/final)
    if (parts[0] === '') parts.shift();
    if (parts[parts.length - 1] === '') parts.pop();

    // Limpiar cada parte
    parts = parts.map(part => part.trim());

    // Si es linea de separador, usar guiones
    if (this.isTableSeparatorLine(line)) {
      parts = parts.map(part => {
        // Mantener guiones, pero asegurar minimo 3
        const dashCount = Math.max(3, (part.match(/-/g) || []).length);
        return '-'.repeat(dashCount);
      });
    }

    // Reconstruir linea con espaciado correcto
    return '| ' + parts.join(' | ') + ' |';
  }

  /**
   * Corrige el numero de columnas en las tablas
   * Asegura que todas las filas tengan el mismo numero de columnas
   * @param {string} content - Contenido a procesar
   * @returns {string} - Contenido corregido
   */
  fixTableColumnCount(content) {
    const lines = content.split('\n');
    const processedLines = [];
    let inTable = false;
    let tableLines = [];
    let expectedColumns = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.isTableLine(line)) {
        if (!inTable) {
          // Inicio de tabla
          inTable = true;
          tableLines = [];
          expectedColumns = this.countTableColumns(line);
        }
        
        tableLines.push(line);
        
        // Verificar si la siguiente linea NO es parte de la tabla
        const nextLine = lines[i + 1];
        if (!nextLine || !this.isTableLine(nextLine)) {
          // Fin de tabla, procesar y agregar
          const processedTable = this.normalizeTableColumns(tableLines, expectedColumns);
          processedLines.push(...processedTable);
          inTable = false;
          tableLines = [];
          expectedColumns = 0;
        }
      } else {
        if (inTable) {
          // La tabla termino abruptamente
          const processedTable = this.normalizeTableColumns(tableLines, expectedColumns);
          processedLines.push(...processedTable);
          inTable = false;
          tableLines = [];
          expectedColumns = 0;
        }
        processedLines.push(line);
      }
    }

    // Procesar tabla pendiente si existe
    if (inTable && tableLines.length > 0) {
      const processedTable = this.normalizeTableColumns(tableLines, expectedColumns);
      processedLines.push(...processedTable);
    }

    return processedLines.join('\n');
  }

  /**
   * Normaliza el numero de columnas en un conjunto de lineas de tabla
   * @param {Array<string>} tableLines - Lineas de la tabla
   * @param {number} expectedColumns - Numero esperado de columnas
   * @returns {Array<string>} - Lineas normalizadas
   */
  normalizeTableColumns(tableLines, expectedColumns) {
    return tableLines.map((line, index) => {
      const currentColumns = this.countTableColumns(line);
      
      if (currentColumns === expectedColumns) {
        return line;
      }

      // Si tiene menos columnas, agregar celdas vacias
      if (currentColumns < expectedColumns) {
        const trimmed = line.trim();
        let cleaned = trimmed;
        
        if (cleaned.endsWith('|')) {
          cleaned = cleaned.substring(0, cleaned.length - 1);
        }

        const missingColumns = expectedColumns - currentColumns;
        const emptyCell = this.isTableSeparatorLine(line) ? ' --- ' : '  ';
        const addition = Array(missingColumns).fill(emptyCell).join('|');
        
        return cleaned + '|' + addition + '|';
      }

      // Si tiene mas columnas, truncar
      if (currentColumns > expectedColumns) {
        const parts = line.trim().split('|').filter(p => p !== '');
        const truncated = parts.slice(0, expectedColumns);
        return '| ' + truncated.join(' | ') + ' |';
      }

      return line;
    });
  }

  /**
   * Procesa contenido en streaming (sin procesamiento pesado)
   * @param {string} chunk - Chunk de contenido
   * @returns {string} - Chunk procesado
   */
  processStreamChunk(chunk) {
    // En streaming solo hacemos limpieza basica
    // El procesamiento completo se hace al final
    return chunk;
  }

  /**
   * Procesa contenido completo al finalizar streaming
   * @param {string} fullContent - Contenido completo
   * @returns {string} - Contenido procesado
   */
  processStreamComplete(fullContent) {
    return this.process(fullContent);
  }
}

module.exports = new MarkdownProcessorService();