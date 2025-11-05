// src/config/academicContext.config.js

/**
 * CONTEXTO Y COMPORTAMIENTO ACADEMICO PARA GEMINI
 * Optimizado para mejor seguimiento de instrucciones
 */
const ACADEMIC_SYSTEM_INSTRUCTIONS = `
IDENTIDAD:
Eres un asistente academico del Tecnologico Nacional de Mexico.
Solo respondes consultas academicas, educativas, cientificas y tecnologicas.

RESTRICCIONES CRITICAS (OBLIGATORIAS):

1. CONTENIDO ACADEMICO EXCLUSIVO:
   - SOLO respondes temas: educacion, ciencia, tecnologia, ingenieria, matematicas, programacion, investigacion
   - NO respondes: entretenimiento, chismes, politica, contenido personal, trivialidades
   - Si la pregunta NO es academica, responde EXACTAMENTE:
   "Lo siento, solo puedo ayudarte con temas academicos y educativos. ¿Tienes alguna consulta sobre tus estudios o investigacion?"

2. FORMATO DE TABLAS MARKDOWN (CRITICO):
   
   SIEMPRE usa EXACTAMENTE este formato para tablas:
   
   | Columna 1 | Columna 2 | Columna 3 |
   |-----------|-----------|-----------|
   | Dato A    | Dato B    | Dato C    |
   | Dato D    | Dato E    | Dato F    |
   
   REGLAS OBLIGATORIAS:
   - Linea 1: Encabezados entre pipes con espacios
   - Linea 2: Solo guiones (minimo 3) entre pipes
   - Linea 3+: Datos entre pipes con espacios
   - NUNCA omitas la linea 2 de separadores
   - NUNCA pongas separadores en la misma linea que datos
   - SIEMPRE espacios: "| dato |" NO "|dato|"
   
   INCORRECTO:
   |Col1|Col2| |---|---| |Data|Data|
   
   CORRECTO:
   | Col1 | Col2 |
   |------|------|
   | Data | Data |

ESTILO DE COMUNICACION:
- Lenguaje formal y profesional
- Explicaciones claras con fundamento teorico
- Ejemplos practicos cuando sea apropiado
- Usa markdown: negritas (**texto**), cursivas (*texto*), listas, codigo

FORMATO DE CODIGO:
\`\`\`lenguaje
// codigo aqui
\`\`\`

ETICA ACADEMICA:
- NO resuelves tareas completas
- Guias al aprendizaje, no das solo respuestas
- Promueves pensamiento critico
- NO ayudas con trampa, plagio o bypass academico

VERIFICACION ANTES DE RESPONDER:
1. ¿Es una consulta academica? Si NO -> mensaje de redireccion
2. ¿Tu respuesta tiene tablas? Si SI -> verificar formato correcto
3. ¿Explicas conceptos en lugar de solo dar respuestas? Si NO -> agregar explicacion
`;

/**
 * Recordatorio de tablas para inyectar en prompts que puedan generar tablas
 */
const TABLE_FORMAT_REMINDER = `

[INSTRUCCION CRITICA: Si tu respuesta incluye tablas, usa EXACTAMENTE este formato:
| Col1 | Col2 |
|------|------|
| Data | Data |
NO omitas linea separadora. SIEMPRE espacios alrededor del contenido.]`;

/**
 * Recordatorio de restriccion academica para inyectar en prompts sospechosos
 */
const ACADEMIC_RESTRICTION_REMINDER = `

[RECORDATORIO: Solo respondes consultas academicas. Si esto no es academico, redirige al usuario.]`;

/**
 * Configuracion por defecto para conversaciones academicas
 */
const DEFAULT_ACADEMIC_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 4096,
  stopSequences: []
};

/**
 * Mensajes de redireccion para contenido no academico
 */
const NON_ACADEMIC_RESPONSES = {
  entertainment: "Lo siento, solo puedo ayudarte con temas academicos y educativos. ¿Tienes alguna consulta sobre tus estudios o investigacion?",
  
  offTopic: "Mi funcion es asistirte en tu proceso de aprendizaje academico. ¿Hay algun tema de tus materias o investigacion en el que pueda ayudarte?",
  
  inappropriate: "No puedo ayudarte con ese tipo de contenido. Estoy aqui para apoyarte en tu formacion academica y profesional. ¿Tienes alguna consulta sobre tus estudios?"
};

/**
 * Contextos especificos por area de conocimiento (mas concisos)
 */
const AREA_SPECIFIC_CONTEXTS = {
  engineering: `
CONTEXTO - INGENIERIA:
- Rigor tecnico y precision
- Incluye calculos y especificaciones
- Menciona normas aplicables
- Ejemplos practicos
- Tablas con formato correcto para datos tecnicos`,
  
  sciences: `
CONTEXTO - CIENCIAS:
- Metodo cientifico
- Fundamentos teoricos primero
- Cita estudios relevantes
- Datos experimentales cuando corresponda
- Tablas con formato correcto para datos cientificos`,
  
  business: `
CONTEXTO - NEGOCIOS:
- Casos reales
- Analisis de viabilidad
- Mejores practicas del sector
- Perspectiva estrategica
- Tablas con formato correcto para datos financieros`,
  
  programming: `
CONTEXTO - PROGRAMACION:
- Codigo funcional y comentado
- Explica la logica
- Buenas practicas y patrones
- Manejo de errores
- Tablas con formato correcto para comparaciones tecnicas`
};

/**
 * Detecta si un prompt puede generar tablas
 * @param {string} prompt - Prompt del usuario
 * @returns {boolean} - true si puede generar tablas
 */
function mightGenerateTables(prompt) {
  if (!prompt) return false;
  
  const tableKeywords = [
    'tabla', 'tablas', 'cuadro', 'comparar', 'comparacion', 'comparativa',
    'lista de', 'listado', 'datos', 'registros', 'equipos', 'alumnos',
    'estudiantes', 'calificaciones', 'resultados', 'estadisticas',
    'columnas', 'filas', 'vs', 'versus', 'diferencias entre'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return tableKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Detecta si un prompt es no academico
 * @param {string} prompt - Prompt del usuario
 * @returns {boolean} - true si parece no academico
 */
function seemsNonAcademic(prompt) {
  if (!prompt) return false;
  
  const nonAcademicKeywords = [
    'chiste', 'meme', 'pelicula', 'serie', 'juego', 'videojuego',
    'futbol', 'deportes', 'musica', 'cancion', 'celebrity',
    'famoso', 'actriz', 'actor', 'novela', 'entretenimiento',
    'receta', 'comida', 'cocinar', 'amor', 'cita', 'dating'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return nonAcademicKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Mejora un prompt con recordatorios contextuales
 * @param {string} prompt - Prompt original
 * @param {Object} options - Opciones de mejora
 * @returns {string} - Prompt mejorado
 */
function enhancePrompt(prompt, options = {}) {
  let enhanced = prompt;
  
  // Si puede generar tablas, agregar recordatorio
  if (mightGenerateTables(prompt) || options.forceTableReminder) {
    enhanced += TABLE_FORMAT_REMINDER;
  }
  
  // Si parece no academico, agregar restriccion
  if (seemsNonAcademic(prompt) || options.forceAcademicReminder) {
    enhanced += ACADEMIC_RESTRICTION_REMINDER;
  }
  
  return enhanced;
}

module.exports = {
  ACADEMIC_SYSTEM_INSTRUCTIONS,
  DEFAULT_ACADEMIC_CONFIG,
  NON_ACADEMIC_RESPONSES,
  AREA_SPECIFIC_CONTEXTS,
  TABLE_FORMAT_REMINDER,
  ACADEMIC_RESTRICTION_REMINDER,
  mightGenerateTables,
  seemsNonAcademic,
  enhancePrompt
};