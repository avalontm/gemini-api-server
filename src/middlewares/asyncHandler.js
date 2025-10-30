// src/middlewares/asyncHandler.js

/**
 * Wrapper para funciones async en Express
 * Captura automaticamente errores y los pasa al middleware de error
 * Evita tener que usar try-catch en cada controlador
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Wrapper especifico para middlewares async
 * Similar a asyncHandler pero mas explicito para middlewares
 */
const asyncMiddleware = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Wrapper para funciones async con timeout
 * Rechaza la promesa si tarda mas del tiempo especificado
 * @param {Function} fn - Funcion async a ejecutar
 * @param {number} timeoutMs - Timeout en milisegundos
 * @returns {Function} - Middleware function
 */
const asyncHandlerWithTimeout = (fn, timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`La operacion excedio el tiempo limite de ${timeoutMs}ms`));
      }, timeoutMs);
    });

    Promise.race([
      fn(req, res, next),
      timeoutPromise,
    ]).catch(next);
  };
};

/**
 * Wrapper para funciones async con reintentos
 * Reintenta la operacion N veces si falla
 * @param {Function} fn - Funcion async a ejecutar
 * @param {number} retries - Numero de reintentos
 * @param {number} delay - Delay entre reintentos en ms
 * @returns {Function} - Middleware function
 */
const asyncHandlerWithRetry = (fn, retries = 3, delay = 1000) => {
  return async (req, res, next) => {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(req, res, next);
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          // Esperar antes de reintentar
          await new Promise(resolve => setTimeout(resolve, delay));
          console.log(`Reintento ${attempt + 1}/${retries} para ${req.method} ${req.path}`);
        }
      }
    }
    
    // Si todos los reintentos fallaron, pasar el error
    next(lastError);
  };
};

/**
 * Wrapper para validar y ejecutar funciones async
 * Valida que la funcion sea realmente async antes de ejecutar
 */
const safeAsyncHandler = (fn) => {
  if (typeof fn !== 'function') {
    throw new Error('asyncHandler requiere una funcion como argumento');
  }

  return (req, res, next) => {
    const result = fn(req, res, next);
    
    if (result && typeof result.catch === 'function') {
      result.catch(next);
    } else {
      // Si no es una promesa, continuar normalmente
      return result;
    }
  };
};

/**
 * Wrapper para ejecutar multiples handlers async en secuencia
 * Util para componer middlewares
 * @param  {...Function} handlers - Array de handlers async
 * @returns {Function} - Middleware function
 */
const asyncSequence = (...handlers) => {
  return async (req, res, next) => {
    try {
      for (const handler of handlers) {
        await handler(req, res, next);
        
        // Si la respuesta ya fue enviada, detener
        if (res.headersSent) {
          return;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Wrapper para ejecutar handlers async en paralelo
 * Ejecuta todos los handlers y espera a que terminen
 * @param  {...Function} handlers - Array de handlers async
 * @returns {Function} - Middleware function
 */
const asyncParallel = (...handlers) => {
  return async (req, res, next) => {
    try {
      await Promise.all(
        handlers.map(handler => handler(req, res, next))
      );
      
      if (!res.headersSent) {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Wrapper que agrega logging automatico a funciones async
 * Util para debugging
 */
const asyncHandlerWithLogging = (fn, loggerInstance = console) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      loggerInstance.log(`[START] ${req.method} ${req.path}`);
      await fn(req, res, next);
      
      const duration = Date.now() - startTime;
      loggerInstance.log(`[END] ${req.method} ${req.path} - ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      loggerInstance.error(`[ERROR] ${req.method} ${req.path} - ${duration}ms - ${error.message}`);
      next(error);
    }
  };
};

/**
 * Wrapper para ejecutar handlers condicionales
 * Solo ejecuta el handler si la condicion es verdadera
 * @param {Function} condition - Funcion que retorna boolean
 * @param {Function} handler - Handler a ejecutar si condicion es true
 * @returns {Function} - Middleware function
 */
const conditionalAsyncHandler = (condition, handler) => {
  return async (req, res, next) => {
    try {
      const shouldExecute = typeof condition === 'function' 
        ? await condition(req, res)
        : condition;
      
      if (shouldExecute) {
        await handler(req, res, next);
      } else {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Crear un wrapper personalizado con opciones
 * @param {Object} options - Opciones de configuracion
 * @returns {Function} - Wrapper function
 */
const createAsyncHandler = (options = {}) => {
  const {
    timeout = null,
    retries = 0,
    retryDelay = 1000,
    logging = false,
    logger = console,
  } = options;

  return (fn) => {
    let handler = fn;

    // Aplicar retry si esta configurado
    if (retries > 0) {
      handler = asyncHandlerWithRetry(handler, retries, retryDelay);
    }

    // Aplicar timeout si esta configurado
    if (timeout) {
      handler = asyncHandlerWithTimeout(handler, timeout);
    }

    // Aplicar logging si esta configurado
    if (logging) {
      handler = asyncHandlerWithLogging(handler, logger);
    }

    return handler;
  };
};

module.exports = {
  asyncHandler,
  asyncMiddleware,
  asyncHandlerWithTimeout,
  asyncHandlerWithRetry,
  safeAsyncHandler,
  asyncSequence,
  asyncParallel,
  asyncHandlerWithLogging,
  conditionalAsyncHandler,
  createAsyncHandler,
};