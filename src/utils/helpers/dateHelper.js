// src/utils/helpers/dateHelper.js

/**
 * Helpers para manejo y formateo de fechas
 */

/**
 * Formatear fecha a string legible
 * @param {Date|string} date - Fecha a formatear
 * @param {string} locale - Locale para formato (default: 'es-MX')
 * @returns {string} - Fecha formateada
 */
const formatDate = (date, locale = 'es-MX') => {
  if (!date) {
    return '';
  }

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Fecha invalida';
  }

  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formatear fecha y hora a string legible
 * @param {Date|string} date - Fecha a formatear
 * @param {string} locale - Locale para formato (default: 'es-MX')
 * @returns {string} - Fecha y hora formateadas
 */
const formatDateTime = (date, locale = 'es-MX') => {
  if (!date) {
    return '';
  }

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Fecha invalida';
  }

  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatear hora
 * @param {Date|string} date - Fecha a formatear
 * @param {string} locale - Locale para formato (default: 'es-MX')
 * @returns {string} - Hora formateada
 */
const formatTime = (date, locale = 'es-MX') => {
  if (!date) {
    return '';
  }

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Fecha invalida';
  }

  return dateObj.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatear fecha en formato ISO
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha en formato ISO
 */
const formatISO = (date) => {
  if (!date) {
    return '';
  }

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toISOString();
};

/**
 * Obtener fecha actual en formato ISO
 * @returns {string} - Fecha actual en formato ISO
 */
const getCurrentDateISO = () => {
  return new Date().toISOString();
};

/**
 * Obtener timestamp actual
 * @returns {number} - Timestamp en milisegundos
 */
const getCurrentTimestamp = () => {
  return Date.now();
};

/**
 * Calcular diferencia entre dos fechas en dias
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {number} - Diferencia en dias
 */
const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Calcular diferencia entre dos fechas en horas
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {number} - Diferencia en horas
 */
const getHoursDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(d2 - d1);
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  
  return diffHours;
};

/**
 * Calcular diferencia entre dos fechas en minutos
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {number} - Diferencia en minutos
 */
const getMinutesDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(d2 - d1);
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  return diffMinutes;
};

/**
 * Agregar dias a una fecha
 * @param {Date|string} date - Fecha base
 * @param {number} days - Numero de dias a agregar
 * @returns {Date} - Nueva fecha
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Agregar horas a una fecha
 * @param {Date|string} date - Fecha base
 * @param {number} hours - Numero de horas a agregar
 * @returns {Date} - Nueva fecha
 */
const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

/**
 * Agregar minutos a una fecha
 * @param {Date|string} date - Fecha base
 * @param {number} minutes - Numero de minutos a agregar
 * @returns {Date} - Nueva fecha
 */
const addMinutes = (date, minutes) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

/**
 * Verificar si una fecha es valida
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} - True si es valida
 */
const isValidDate = (date) => {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

/**
 * Verificar si una fecha es pasada
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} - True si es pasada
 */
const isPastDate = (date) => {
  const dateObj = new Date(date);
  return dateObj < new Date();
};

/**
 * Verificar si una fecha es futura
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} - True si es futura
 */
const isFutureDate = (date) => {
  const dateObj = new Date(date);
  return dateObj > new Date();
};

/**
 * Verificar si una fecha es hoy
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} - True si es hoy
 */
const isToday = (date) => {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
};

/**
 * Obtener tiempo relativo (hace X horas/dias)
 * @param {Date|string} date - Fecha base
 * @returns {string} - Tiempo relativo
 */
const getRelativeTime = (date) => {
  if (!date) {
    return '';
  }

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Fecha invalida';
  }

  const now = new Date();
  const diffMs = now - dateObj;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'Hace unos segundos';
  } else if (diffMinutes < 60) {
    return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `Hace ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } else if (diffWeeks < 4) {
    return `Hace ${diffWeeks} semana${diffWeeks > 1 ? 's' : ''}`;
  } else if (diffMonths < 12) {
    return `Hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
  } else {
    return `Hace ${diffYears} ano${diffYears > 1 ? 's' : ''}`;
  }
};

/**
 * Obtener inicio del dia
 * @param {Date|string} date - Fecha base
 * @returns {Date} - Inicio del dia
 */
const getStartOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Obtener fin del dia
 * @param {Date|string} date - Fecha base
 * @returns {Date} - Fin del dia
 */
const getEndOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Obtener inicio de la semana
 * @param {Date|string} date - Fecha base
 * @returns {Date} - Inicio de la semana
 */
const getStartOfWeek = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Obtener fin de la semana
 * @param {Date|string} date - Fecha base
 * @returns {Date} - Fin de la semana
 */
const getEndOfWeek = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() + (6 - day);
  result.setDate(diff);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Obtener inicio del mes
 * @param {Date|string} date - Fecha base
 * @returns {Date} - Inicio del mes
 */
const getStartOfMonth = (date) => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Obtener fin del mes
 * @param {Date|string} date - Fecha base
 * @returns {Date} - Fin del mes
 */
const getEndOfMonth = (date) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Parsear fecha desde string con formato especifico
 * @param {string} dateString - String de fecha
 * @param {string} format - Formato esperado (DD/MM/YYYY, MM/DD/YYYY, etc)
 * @returns {Date|null} - Fecha parseada o null
 */
const parseDate = (dateString, format = 'DD/MM/YYYY') => {
  if (!dateString) {
    return null;
  }

  try {
    if (format === 'DD/MM/YYYY') {
      const [day, month, year] = dateString.split('/');
      return new Date(year, month - 1, day);
    } else if (format === 'MM/DD/YYYY') {
      const [month, day, year] = dateString.split('/');
      return new Date(year, month - 1, day);
    } else if (format === 'YYYY-MM-DD') {
      return new Date(dateString);
    }
    
    return new Date(dateString);
  } catch (error) {
    return null;
  }
};

module.exports = {
  formatDate,
  formatDateTime,
  formatTime,
  formatISO,
  getCurrentDateISO,
  getCurrentTimestamp,
  getDaysDifference,
  getHoursDifference,
  getMinutesDifference,
  addDays,
  addHours,
  addMinutes,
  isValidDate,
  isPastDate,
  isFutureDate,
  isToday,
  getRelativeTime,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  parseDate,
};