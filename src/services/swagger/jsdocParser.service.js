// src/services/swagger/jsdocParser.service.js

const fs = require('fs').promises;

class JSDocParserService {
  /**
   * Parsea comentarios JSDoc de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Object>} - Documentacion parseada
   */
  async parse(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const jsdocBlocks = this.extractJSDocBlocks(content);
      
      const documentation = {
        summary: '',
        description: '',
        tags: [],
        params: [],
        responses: {},
        requestBody: null,
        security: []
      };

      for (const block of jsdocBlocks) {
        const parsed = this.parseJSDocBlock(block);
        Object.assign(documentation, parsed);
      }

      return documentation;
    } catch (error) {
      console.warn(`Warning: No se pudo parsear JSDoc de ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extrae bloques JSDoc del contenido
   * @param {string} content - Contenido del archivo
   * @returns {Array<string>} - Array de bloques JSDoc
   */
  extractJSDocBlocks(content) {
    const blocks = [];
    const regex = /\/\*\*([\s\S]*?)\*\//g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      blocks.push(match[1]);
    }

    return blocks;
  }

  /**
   * Parsea un bloque JSDoc individual
   * @param {string} block - Bloque JSDoc
   * @returns {Object} - Informacion parseada
   */
  parseJSDocBlock(block) {
    const lines = block.split('\n').map(line => line.trim().replace(/^\*\s?/, ''));
    
    const doc = {
      summary: '',
      description: '',
      tags: [],
      params: [],
      responses: {},
      requestBody: null,
      security: []
    };

    let currentSection = 'description';
    let descriptionLines = [];

    for (const line of lines) {
      if (!line) continue;

      if (line.startsWith('@swagger')) {
        currentSection = 'swagger';
        continue;
      }

      if (line.startsWith('@summary')) {
        doc.summary = line.replace('@summary', '').trim();
        continue;
      }

      if (line.startsWith('@description')) {
        doc.description = line.replace('@description', '').trim();
        continue;
      }

      if (line.startsWith('@tags')) {
        const tags = line.replace('@tags', '').trim().split(',').map(t => t.trim());
        doc.tags.push(...tags);
        continue;
      }

      if (line.startsWith('@param')) {
        const param = this.parseParamTag(line);
        if (param) doc.params.push(param);
        continue;
      }

      if (line.startsWith('@query')) {
        const param = this.parseQueryTag(line);
        if (param) doc.params.push(param);
        continue;
      }

      if (line.startsWith('@body')) {
        doc.requestBody = this.parseBodyTag(line);
        continue;
      }

      if (line.startsWith('@response')) {
        const response = this.parseResponseTag(line);
        if (response) {
          doc.responses[response.code] = response;
        }
        continue;
      }

      if (line.startsWith('@security')) {
        const security = line.replace('@security', '').trim();
        doc.security.push(security);
        continue;
      }

      if (currentSection === 'description' && !line.startsWith('@')) {
        descriptionLines.push(line);
      }
    }

    if (!doc.description && descriptionLines.length > 0) {
      doc.description = descriptionLines.join(' ').trim();
    }

    if (!doc.summary && doc.description) {
      doc.summary = doc.description.split('.')[0] + '.';
    }

    return doc;
  }

  /**
   * Parsea tag @param
   * @param {string} line - Linea con @param
   * @returns {Object|null} - Parametro parseado
   */
  parseParamTag(line) {
    const match = line.match(/@param\s+\{([^}]+)\}\s+(\w+)\s*-?\s*(.*)/);
    
    if (!match) return null;

    return {
      name: match[2],
      type: match[1],
      in: 'path',
      required: true,
      description: match[3] || ''
    };
  }

  /**
   * Parsea tag @query
   * @param {string} line - Linea con @query
   * @returns {Object|null} - Query param parseado
   */
  parseQueryTag(line) {
    const match = line.match(/@query\s+\{([^}]+)\}\s+(\w+)\s*-?\s*(.*)/);
    
    if (!match) return null;

    const required = match[1].includes('required');
    const type = match[1].replace('required', '').trim();

    return {
      name: match[2],
      type: type || 'string',
      in: 'query',
      required,
      description: match[3] || ''
    };
  }

  /**
   * Parsea tag @body
   * @param {string} line - Linea con @body
   * @returns {Object|null} - Request body parseado
   */
  parseBodyTag(line) {
    const match = line.match(/@body\s+\{([^}]+)\}\s*(.*)/);
    
    if (!match) return null;

    return {
      contentType: 'application/json',
      schema: this.parseSchemaType(match[1]),
      description: match[2] || ''
    };
  }

  /**
   * Parsea tag @response
   * @param {string} line - Linea con @response
   * @returns {Object|null} - Response parseado
   */
  parseResponseTag(line) {
    const match = line.match(/@response\s+(\d{3})\s+\{([^}]+)\}\s*(.*)/);
    
    if (!match) return null;

    return {
      code: match[1],
      schema: this.parseSchemaType(match[2]),
      description: match[3] || ''
    };
  }

  /**
   * Parsea tipo de schema
   * @param {string} typeString - String con el tipo
   * @returns {Object} - Schema OpenAPI
   */
  parseSchemaType(typeString) {
    const cleaned = typeString.trim();

    if (cleaned === 'string') {
      return { type: 'string' };
    }

    if (cleaned === 'number' || cleaned === 'integer') {
      return { type: cleaned };
    }

    if (cleaned === 'boolean') {
      return { type: 'boolean' };
    }

    if (cleaned.startsWith('array<')) {
      const itemType = cleaned.match(/array<(.+)>/)?.[1] || 'string';
      return {
        type: 'array',
        items: this.parseSchemaType(itemType)
      };
    }

    if (cleaned === 'object' || cleaned.startsWith('{')) {
      return { type: 'object' };
    }

    return { $ref: `#/components/schemas/${cleaned}` };
  }

  /**
   * Extrae ejemplos de codigo del JSDoc
   * @param {string} block - Bloque JSDoc
   * @returns {Array<Object>} - Array de ejemplos
   */
  extractExamples(block) {
    const examples = [];
    const exampleRegex = /@example\s+([\s\S]*?)(?=@|$)/g;
    let match;

    while ((match = exampleRegex.exec(block)) !== null) {
      const example = match[1].trim();
      examples.push({
        code: example,
        language: this.detectLanguage(example)
      });
    }

    return examples;
  }

  /**
   * Detecta lenguaje de un ejemplo de codigo
   * @param {string} code - Codigo de ejemplo
   * @returns {string} - Lenguaje detectado
   */
  detectLanguage(code) {
    if (code.includes('const') || code.includes('let') || code.includes('function')) {
      return 'javascript';
    }
    if (code.includes('curl')) {
      return 'bash';
    }
    if (code.includes('{') && code.includes('}')) {
      return 'json';
    }
    return 'text';
  }

  /**
   * Valida formato de JSDoc
   * @param {string} block - Bloque JSDoc
   * @returns {Object} - Resultado de validacion
   */
  validateJSDoc(block) {
    const errors = [];
    const warnings = [];

    if (!block.includes('@summary') && !block.includes('@description')) {
      warnings.push('Falta descripcion o summary');
    }

    const hasOpeningTag = block.includes('/**');
    const hasClosingTag = block.includes('*/');

    if (!hasOpeningTag || !hasClosingTag) {
      errors.push('Formato JSDoc invalido');
    }

    const paramMatches = block.match(/@param/g);
    const bodyMatches = block.match(/@body/g);

    if (paramMatches && paramMatches.length > 10) {
      warnings.push('Demasiados parametros, considere usar un objeto');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Genera JSDoc a partir de firma de funcion
   * @param {string} functionSignature - Firma de la funcion
   * @returns {string} - JSDoc generado
   */
  generateJSDoc(functionSignature) {
    const params = this.extractFunctionParams(functionSignature);
    
    let jsdoc = '/**\n';
    jsdoc += ' * Descripcion de la funcion\n';
    
    for (const param of params) {
      jsdoc += ` * @param {*} ${param} - Descripcion del parametro\n`;
    }
    
    jsdoc += ' * @returns {*} - Descripcion del retorno\n';
    jsdoc += ' */\n';

    return jsdoc;
  }

  /**
   * Extrae parametros de firma de funcion
   * @param {string} signature - Firma de funcion
   * @returns {Array<string>} - Array de nombres de parametros
   */
  extractFunctionParams(signature) {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];

    const paramsString = match[1];
    if (!paramsString.trim()) return [];

    return paramsString
      .split(',')
      .map(p => p.trim().split('=')[0].trim())
      .filter(p => p.length > 0);
  }

  /**
   * Convierte JSDoc a formato Swagger
   * @param {Object} jsdoc - JSDoc parseado
   * @returns {Object} - Formato Swagger
   */
  toSwaggerFormat(jsdoc) {
    const swagger = {
      summary: jsdoc.summary || '',
      description: jsdoc.description || '',
      tags: jsdoc.tags || [],
      parameters: [],
      responses: {}
    };

    if (jsdoc.params) {
      swagger.parameters = jsdoc.params.map(param => ({
        name: param.name,
        in: param.in || 'query',
        required: param.required || false,
        schema: { type: param.type || 'string' },
        description: param.description || ''
      }));
    }

    if (jsdoc.requestBody) {
      swagger.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: jsdoc.requestBody.schema
          }
        }
      };
    }

    if (jsdoc.responses) {
      for (const [code, response] of Object.entries(jsdoc.responses)) {
        swagger.responses[code] = {
          description: response.description || '',
          content: {
            'application/json': {
              schema: response.schema
            }
          }
        };
      }
    }

    if (jsdoc.security && jsdoc.security.length > 0) {
      swagger.security = jsdoc.security.map(sec => ({ [sec]: [] }));
    }

    return swagger;
  }
}

module.exports = new JSDocParserService();