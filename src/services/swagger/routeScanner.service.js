// src/services/swagger/routeScanner.service.js

const fs = require('fs').promises;
const path = require('path');

class RouteScannerService {
  /**
   * Escanea directorio de rutas y extrae informacion
   * @param {string} routesPath - Ruta del directorio de rutas
   * @returns {Promise<Array>} - Array de rutas encontradas
   */
  async scanRoutes(routesPath) {
    try {
      const routes = [];
      const files = await this.getAllRouteFiles(routesPath);

      for (const file of files) {
        const fileRoutes = await this.extractRoutesFromFile(file);
        routes.push(...fileRoutes);
      }

      return routes;
    } catch (error) {
      throw new Error(`Error escaneando rutas: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los archivos de rutas recursivamente
   * @param {string} dir - Directorio a escanear
   * @returns {Promise<Array<string>>} - Array de paths de archivos
   */
  async getAllRouteFiles(dir) {
    try {
      const files = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllRouteFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.routes.js')) {
          files.push(fullPath);
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Error leyendo directorio: ${error.message}`);
    }
  }

  /**
   * Extrae rutas de un archivo
   * @param {string} filePath - Path del archivo
   * @returns {Promise<Array>} - Array de rutas
   */
  async extractRoutesFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const routes = [];

      const routePatterns = [
        /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"].*\)/g,
        /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g
      ];

      for (const pattern of routePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const routePath = match[2];

          const requiresAuth = this.checkIfRequiresAuth(content, routePath);

          routes.push({
            method,
            path: this.normalizeRoutePath(routePath),
            filePath,
            requiresAuth,
            fileName: path.basename(filePath)
          });
        }
      }

      return routes;
    } catch (error) {
      throw new Error(`Error extrayendo rutas de ${filePath}: ${error.message}`);
    }
  }

  /**
   * Verifica si una ruta requiere autenticacion
   * @param {string} content - Contenido del archivo
   * @param {string} routePath - Path de la ruta
   * @returns {boolean} - true si requiere auth
   */
  checkIfRequiresAuth(content, routePath) {
    const authMiddlewares = [
      'authenticate',
      'auth',
      'requireAuth',
      'verifyToken',
      'isAuthenticated'
    ];

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes(routePath)) {
        const routeLine = line;
        
        for (const middleware of authMiddlewares) {
          if (routeLine.includes(middleware)) {
            return true;
          }
        }

        if (i > 0) {
          const previousLine = lines[i - 1];
          for (const middleware of authMiddlewares) {
            if (previousLine.includes(middleware)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Normaliza path de ruta
   * @param {string} routePath - Path original
   * @returns {string} - Path normalizado
   */
  normalizeRoutePath(routePath) {
    let normalized = routePath;

    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    normalized = normalized.replace(/\/+/g, '/');

    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  /**
   * Agrupa rutas por prefijo
   * @param {Array} routes - Array de rutas
   * @returns {Object} - Rutas agrupadas
   */
  groupRoutesByPrefix(routes) {
    const grouped = {};

    for (const route of routes) {
      const prefix = this.extractPrefix(route.path);
      
      if (!grouped[prefix]) {
        grouped[prefix] = [];
      }

      grouped[prefix].push(route);
    }

    return grouped;
  }

  /**
   * Extrae prefijo de una ruta
   * @param {string} path - Path de la ruta
   * @returns {string} - Prefijo
   */
  extractPrefix(path) {
    const parts = path.split('/').filter(p => p.length > 0);
    
    if (parts.length === 0) {
      return '/';
    }

    if (parts[0] === 'api') {
      return parts[1] || 'api';
    }

    return parts[0];
  }

  /**
   * Filtra rutas por metodo HTTP
   * @param {Array} routes - Array de rutas
   * @param {string} method - Metodo HTTP
   * @returns {Array} - Rutas filtradas
   */
  filterByMethod(routes, method) {
    return routes.filter(route => route.method === method.toUpperCase());
  }

  /**
   * Filtra rutas que requieren autenticacion
   * @param {Array} routes - Array de rutas
   * @returns {Array} - Rutas protegidas
   */
  filterProtectedRoutes(routes) {
    return routes.filter(route => route.requiresAuth);
  }

  /**
   * Filtra rutas publicas
   * @param {Array} routes - Array de rutas
   * @returns {Array} - Rutas publicas
   */
  filterPublicRoutes(routes) {
    return routes.filter(route => !route.requiresAuth);
  }

  /**
   * Obtiene estadisticas de las rutas
   * @param {Array} routes - Array de rutas
   * @returns {Object} - Estadisticas
   */
  getRoutesStats(routes) {
    const stats = {
      total: routes.length,
      byMethod: {},
      protected: 0,
      public: 0,
      byPrefix: {}
    };

    for (const route of routes) {
      if (!stats.byMethod[route.method]) {
        stats.byMethod[route.method] = 0;
      }
      stats.byMethod[route.method]++;

      if (route.requiresAuth) {
        stats.protected++;
      } else {
        stats.public++;
      }

      const prefix = this.extractPrefix(route.path);
      if (!stats.byPrefix[prefix]) {
        stats.byPrefix[prefix] = 0;
      }
      stats.byPrefix[prefix]++;
    }

    return stats;
  }

  /**
   * Busca rutas por patron
   * @param {Array} routes - Array de rutas
   * @param {string} pattern - Patron a buscar
   * @returns {Array} - Rutas que coinciden
   */
  searchRoutes(routes, pattern) {
    const regex = new RegExp(pattern, 'i');
    return routes.filter(route => 
      regex.test(route.path) || regex.test(route.method)
    );
  }

  /**
   * Valida consistencia de rutas
   * @param {Array} routes - Array de rutas
   * @returns {Object} - Resultado de validacion
   */
  validateRoutes(routes) {
    const errors = [];
    const warnings = [];
    const seen = new Set();

    for (const route of routes) {
      const key = `${route.method}:${route.path}`;

      if (seen.has(key)) {
        errors.push(`Ruta duplicada: ${key}`);
      }
      seen.add(key);

      if (!route.path.startsWith('/')) {
        warnings.push(`Ruta sin slash inicial: ${route.path}`);
      }

      if (route.path.includes('//')) {
        warnings.push(`Ruta con doble slash: ${route.path}`);
      }

      if (route.path.length > 1 && route.path.endsWith('/')) {
        warnings.push(`Ruta termina en slash: ${route.path}`);
      }

      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
      if (!validMethods.includes(route.method)) {
        errors.push(`Metodo HTTP invalido: ${route.method} en ${route.path}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extrae parametros de path
   * @param {string} path - Path de la ruta
   * @returns {Array<string>} - Array de nombres de parametros
   */
  extractPathParams(path) {
    const params = [];
    const matches = path.matchAll(/:(\w+)/g);

    for (const match of matches) {
      params.push(match[1]);
    }

    return params;
  }

  /**
   * Genera reporte de rutas en formato texto
   * @param {Array} routes - Array de rutas
   * @returns {string} - Reporte en texto
   */
  generateReport(routes) {
    const stats = this.getRoutesStats(routes);
    const grouped = this.groupRoutesByPrefix(routes);

    let report = 'REPORTE DE RUTAS\n';
    report += '='.repeat(50) + '\n\n';

    report += `Total de rutas: ${stats.total}\n`;
    report += `Rutas protegidas: ${stats.protected}\n`;
    report += `Rutas publicas: ${stats.public}\n\n`;

    report += 'Por metodo HTTP:\n';
    for (const [method, count] of Object.entries(stats.byMethod)) {
      report += `  ${method}: ${count}\n`;
    }
    report += '\n';

    report += 'Por prefijo:\n';
    for (const [prefix, count] of Object.entries(stats.byPrefix)) {
      report += `  /${prefix}: ${count}\n`;
    }
    report += '\n';

    report += 'RUTAS AGRUPADAS\n';
    report += '-'.repeat(50) + '\n\n';

    for (const [prefix, prefixRoutes] of Object.entries(grouped)) {
      report += `[${prefix}]\n`;
      for (const route of prefixRoutes) {
        const auth = route.requiresAuth ? '[AUTH]' : '[PUBLIC]';
        report += `  ${route.method.padEnd(7)} ${route.path} ${auth}\n`;
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Exporta rutas a formato JSON
   * @param {Array} routes - Array de rutas
   * @param {string} outputPath - Path del archivo de salida
   * @returns {Promise<void>}
   */
  async exportToJSON(routes, outputPath) {
    try {
      const data = {
        generatedAt: new Date().toISOString(),
        total: routes.length,
        routes
      };

      await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Rutas exportadas a: ${outputPath}`);
    } catch (error) {
      throw new Error(`Error exportando rutas: ${error.message}`);
    }
  }
}

module.exports = new RouteScannerService();