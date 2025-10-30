// src/middlewares/sanitizer.js

/**
 * Middleware para sanitizar inputs del usuario
 * Previene inyecciones XSS, SQL injection, y otros ataques
 */

/**
 * Sanitizar string basico - remover caracteres peligrosos
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/[<>]/g, '') // Remover < y >
    .trim();
};

/**
 * Sanitizar string para prevenir XSS
 */
const sanitizeXSS = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Sanitizar HTML - remover tags peligrosos
 */
const sanitizeHTML = (html) => {
  if (typeof html !== 'string') {
    return html;
  }
  
  // Lista de tags permitidos (whitelist)
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'];
  
  // Remover todos los tags excepto los permitidos
  let sanitized = html.replace(/<(\/?[a-z]+)[^>]*>/gi, (match, tag) => {
    const tagName = tag.replace('/', '').toLowerCase();
    return allowedTags.includes(tagName) ? match : '';
  });
  
  // Remover atributos peligrosos de los tags permitidos
  sanitized = sanitized.replace(/(<a\s+)([^>]*)(>)/gi, (match, open, attrs, close) => {
    // Solo permitir href en links
    const hrefMatch = attrs.match(/href=["']([^"']*)["']/i);
    if (hrefMatch) {
      return `${open}href="${hrefMatch[1]}"${close}`;
    }
    return `${open}${close}`;
  });
  
  return sanitized;
};

/**
 * Sanitizar para prevenir SQL injection
 */
const sanitizeSQL = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/['";\\]/g, '') // Remover comillas y backslash
    .replace(/--/g, '') // Remover comentarios SQL
    .replace(/\/\*/g, '') // Remover inicio de comentarios multi-linea
    .replace(/\*\//g, '') // Remover fin de comentarios multi-linea
    .trim();
};

/**
 * Sanitizar NoSQL injection (MongoDB)
 */
const sanitizeNoSQL = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSQL);
  }
  
  const sanitized = {};
  
  for (const key in obj) {
    // Remover operadores MongoDB peligrosos
    if (key.startsWith('$') || key.startsWith('_')) {
      continue;
    }
    
    sanitized[key] = sanitizeNoSQL(obj[key]);
  }
  
  return sanitized;
};

/**
 * Sanitizar email
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return email;
  }
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._-]/g, '');
};

/**
 * Sanitizar URL
 */
const sanitizeURL = (url) => {
  if (typeof url !== 'string') {
    return url;
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // Solo permitir protocolos seguros
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }
    
    return parsedUrl.href;
  } catch (error) {
    return '';
  }
};

/**
 * Sanitizar numero de telefono
 */
const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') {
    return phone;
  }
  
  return phone.replace(/[^0-9+()-\s]/g, '').trim();
};

/**
 * Sanitizar nombre de archivo
 */
const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') {
    return filename;
  }
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // Prevenir path traversal
    .substring(0, 255); // Limitar longitud
};

/**
 * Middleware principal de sanitizacion
 * Sanitiza body, query y params
 */
const sanitizer = (req, res, next) => {
  // Sanitizar body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitizar query params
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitizar params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * Sanitizar objeto recursivamente
 */
const sanitizeObject = (obj, depth = 0) => {
  // Prevenir recursion infinita
  if (depth > 10) {
    return obj;
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  const sanitized = {};
  
  for (const key in obj) {
    // Sanitizar la clave
    const sanitizedKey = sanitizeString(key);
    
    // Sanitizar el valor
    sanitized[sanitizedKey] = sanitizeObject(obj[key], depth + 1);
  }
  
  return sanitized;
};

/**
 * Sanitizar valor individual
 */
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return sanitizeXSS(value);
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  if (value === null || value === undefined) {
    return value;
  }
  
  return value;
};

/**
 * Middleware para sanitizar solo campos especificos
 */
const sanitizeFields = (fields = []) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body && req.body[field]) {
        req.body[field] = sanitizeXSS(req.body[field]);
      }
      
      if (req.query && req.query[field]) {
        req.query[field] = sanitizeXSS(req.query[field]);
      }
      
      if (req.params && req.params[field]) {
        req.params[field] = sanitizeXSS(req.params[field]);
      }
    });
    
    next();
  };
};

/**
 * Middleware para sanitizar emails
 */
const sanitizeEmailFields = (fields = ['email']) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body && req.body[field]) {
        req.body[field] = sanitizeEmail(req.body[field]);
      }
      
      if (req.query && req.query[field]) {
        req.query[field] = sanitizeEmail(req.query[field]);
      }
    });
    
    next();
  };
};

/**
 * Middleware para sanitizar URLs
 */
const sanitizeURLFields = (fields = ['url', 'website', 'link']) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body && req.body[field]) {
        req.body[field] = sanitizeURL(req.body[field]);
      }
      
      if (req.query && req.query[field]) {
        req.query[field] = sanitizeURL(req.query[field]);
      }
    });
    
    next();
  };
};

/**
 * Middleware para prevenir NoSQL injection
 */
const preventNoSQLInjection = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSQL(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSQL(req.query);
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSQL(req.params);
  }
  
  next();
};

/**
 * Middleware para sanitizar HTML en campos especificos
 */
const sanitizeHTMLFields = (fields = ['content', 'description', 'bio']) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body && req.body[field]) {
        req.body[field] = sanitizeHTML(req.body[field]);
      }
    });
    
    next();
  };
};

/**
 * Middleware para remover propiedades peligrosas
 */
const removeDangerousProps = (req, res, next) => {
  const dangerousProps = ['__proto__', 'constructor', 'prototype'];
  
  const removeDangerous = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    dangerousProps.forEach(prop => {
      delete obj[prop];
    });
    
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        removeDangerous(obj[key]);
      }
    });
    
    return obj;
  };
  
  if (req.body) {
    req.body = removeDangerous(req.body);
  }
  
  if (req.query) {
    req.query = removeDangerous(req.query);
  }
  
  next();
};

/**
 * Middleware compuesto - aplica todas las sanitizaciones
 */
const fullSanitizer = [
  removeDangerousProps,
  preventNoSQLInjection,
  sanitizer,
];

module.exports = {
  sanitizer,
  sanitizeString,
  sanitizeXSS,
  sanitizeHTML,
  sanitizeSQL,
  sanitizeNoSQL,
  sanitizeEmail,
  sanitizeURL,
  sanitizePhone,
  sanitizeFilename,
  sanitizeObject,
  sanitizeFields,
  sanitizeEmailFields,
  sanitizeURLFields,
  sanitizeHTMLFields,
  preventNoSQLInjection,
  removeDangerousProps,
  fullSanitizer,
};