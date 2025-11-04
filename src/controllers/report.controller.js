// src/controllers/report.controller.js

const geminiClient = require('../services/gemini/geminiClient.service');
const exportDOCXService = require('../services/utils/exportDOCX.service');
const conversationService = require('../services/database/conversation.service');
const messageService = require('../services/database/message.service');

/**
 * INSTRUCCIONES MEJORADAS DE FORMATO MARKDOWN PARA GEMINI
 */
const FORMATTING_INSTRUCTIONS = `
REGLAS CRITICAS DE FORMATO MARKDOWN:

1. TABLAS - FORMATO OBLIGATORIO (MUY IMPORTANTE):
   
   CORRECTO - Cada fila en su propia linea:
   
   | Columna 1 | Columna 2 | Columna 3 |
   |-----------|-----------|-----------|
   | Dato A    | Dato B    | Dato C    |
   | Dato D    | Dato E    | Dato F    |
   
   INCORRECTO - Todo en una linea:
   | Col1 | Col2 ||----|----||| Data1 | Data2 |
   
   REGLAS ESTRICTAS PARA TABLAS:
   - SIEMPRE pon cada fila en una linea separada
   - La primera fila son los encabezados
   - La segunda fila es el separador con guiones: |---|---|
   - Cada celda empieza y termina con |
   - Deja espacios alrededor del contenido de las celdas
   - Alinea las columnas para mejor legibilidad

2. IMAGENES - CUANDO SEA APROPIADO:
   
   Puedes incluir imagenes relevantes usando formato markdown:
   ![Descripcion de la imagen](URL_DE_LA_IMAGEN)
   
   IMPORTANTE:
   - Solo incluye imagenes si son REALMENTE relevantes para el contenido
   - Usa URLs validas de imagenes (formato: .jpg, .png, .webp, .gif)
   - Proporciona descripciones claras y descriptivas
   - Las imagenes deben complementar el texto, no reemplazarlo
   - Preferiblemente usa URLs de servicios confiables como Unsplash, Pexels, etc.
   
   Ejemplo:
   ![Diagrama de arquitectura del sistema](https://images.unsplash.com/photo-ejemplo.jpg)

3. ENCABEZADOS:
   # Titulo Principal (solo uno por documento)
   ## Seccion Principal
   ### Subseccion
   
4. ENFASIS:
   **texto en negritas** para destacar terminos importantes
   *texto en cursiva* para enfasis suave
   
5. LISTAS:
   - Item con vineta 1
   - Item con vineta 2
   
   1. Item numerado 1
   2. Item numerado 2

6. PARRAFOS:
   - Separa parrafos con una linea en blanco
   - Escribe parrafos completos (3-5 oraciones minimo)
   - Usa justificacion completa del texto

7. CODIGO INLINE:
   Usa \`codigo\` para terminos tecnicos o comandos

IMPORTANTE: Si necesitas incluir una tabla, SIEMPRE usa este formato exacto.
`;

/**
 * Plantillas de reportes con prompts especializados
 */
const TEMPLATE_PROMPTS = {
  research_paper: {
    name: 'Documento de Investigacion',
    description: 'Paper de investigacion academico con formato universitario',
    sections: ['Abstract', 'Introduccion', 'Metodologia', 'Resultados', 'Discusion', 'Conclusiones', 'Referencias'],
    generatePrompt: (topic, instructions) => `
Genera un documento de investigacion academico COMPLETO y PROFESIONAL sobre: "${topic}"

${FORMATTING_INSTRUCTIONS}

ESTRUCTURA OBLIGATORIA:

# ${topic}

## Abstract
Escribe un resumen ejecutivo de 150-250 palabras.

## Introduccion
Desarrolla una introduccion solida (4-6 parrafos).

## Metodologia
Describe detalladamente el enfoque metodologico (4-5 parrafos).

## Resultados
Presenta los hallazgos principales (5-7 parrafos).
Si presentas datos numericos, usa tablas con formato correcto.

## Discusion
Analiza e interpreta los resultados (4-5 parrafos).

## Conclusiones
Resume y concluye (3-4 parrafos).

## Referencias
Lista minimo 8-10 referencias academicas en formato APA.

${instructions ? `\n\nINSTRUCCIONES ADICIONALES:\n${instructions}\n` : ''}

RECORDATORIO: Usa lenguaje academico formal y mantén coherencia entre secciones.
`
  },
  
  technical_report: {
    name: 'Reporte Tecnico',
    description: 'Documentacion tecnica detallada y especializada',
    sections: ['Resumen', 'Introduccion', 'Especificaciones', 'Arquitectura', 'Implementacion', 'Pruebas', 'Conclusiones'],
    generatePrompt: (topic, instructions) => `
Genera un reporte tecnico PROFESIONAL y DETALLADO sobre: "${topic}"

${FORMATTING_INSTRUCTIONS}

ESTRUCTURA OBLIGATORIA:

# ${topic}

## Resumen Ejecutivo
Resume en 100-150 palabras el proyecto tecnico.

## Introduccion
Explica el contexto tecnico y objetivos.

## Especificaciones Tecnicas
Detalla requisitos funcionales y no funcionales.
Presenta el stack tecnologico en tabla si es apropiado.

## Arquitectura del Sistema
Describe la arquitectura general y componentes principales.
Puedes incluir diagramas relevantes con URLs de imagenes.

## Implementacion
Describe la estructura del proyecto y modulos principales.

## Pruebas y Validacion
Presenta resultados de pruebas en tablas con formato correcto.

## Conclusiones
Resume logros, desafios superados y trabajo futuro.

## Referencias Tecnicas
Lista documentacion consultada.

${instructions ? `\n\nINSTRUCCIONES ADICIONALES:\n${instructions}\n` : ''}

RECORDATORIO: Usa terminologia tecnica precisa y formato de tablas correcto.
`
  },

  executive_summary: {
    name: 'Resumen Ejecutivo',
    description: 'Reporte ejecutivo conciso para tomadores de decisiones',
    sections: ['Resumen', 'Contexto', 'Analisis', 'Hallazgos', 'Recomendaciones', 'Conclusiones'],
    generatePrompt: (topic, instructions) => `
Genera un resumen ejecutivo PROFESIONAL y CONCISO sobre: "${topic}"

${FORMATTING_INSTRUCTIONS}

ESTRUCTURA:

# ${topic}

## Resumen
Sintetiza en 100-150 palabras el tema, hallazgos y recomendacion clave.

## Contexto
Proporciona antecedentes y objetivos del analisis.

## Puntos Clave
Lista 5 puntos fundamentales con descripciones.

## Analisis Detallado
Profundiza en los puntos clave (3-4 parrafos).
Si presentas comparaciones, usa tablas con formato correcto.

## Hallazgos Principales
Lista 3 hallazgos principales con descripcion y evidencia.

## Recomendaciones Estrategicas
Presenta 3 recomendaciones con descripcion, justificacion e impacto esperado.

## Conclusiones
Resume conclusiones principales y proximos pasos.

## Referencias
Lista fuentes consultadas.

${instructions ? `\n\nINSTRUCCIONES ADICIONALES:\n${instructions}\n` : ''}

RECORDATORIO: Manten contenido conciso pero completo, enfocado en decisores.
`
  },

  market_analysis: {
    name: 'Analisis de Mercado',
    description: 'Estudio completo de mercado y oportunidades',
    sections: ['Resumen', 'Panorama', 'Competencia', 'Tendencias', 'Oportunidades', 'Estrategia', 'Conclusiones'],
    generatePrompt: (topic, instructions) => `
Genera un analisis de mercado COMPLETO y PROFESIONAL sobre: "${topic}"

${FORMATTING_INSTRUCTIONS}

ESTRUCTURA:

# Analisis de Mercado: ${topic}

## Resumen Ejecutivo
Sintetiza tamano del mercado, hallazgos y oportunidades (150-200 palabras).

## Panorama del Mercado
Describe estado actual, tamano, segmentacion y dinamica del mercado.

## Analisis Competitivo
Presenta principales actores en tabla con market share, fortalezas y debilidades.
Incluye analisis de fuerzas de Porter.

## Tendencias del Mercado
Describe 3 tendencias principales con descripcion, impacto y oportunidad.

## Oportunidades Identificadas
Detalla 3 oportunidades con potencial, barreras y recursos necesarios.

## Amenazas y Desafios
Lista amenazas principales y desafios operativos.

## Recomendaciones Estrategicas
Presenta estrategia de entrada/crecimiento, tacticas especificas y plan de accion.

## Conclusiones
Analiza viabilidad del mercado y presenta recomendacion final.

## Referencias
Lista fuentes de datos de mercado consultadas.

${instructions ? `\n\nINSTRUCCIONES ADICIONALES:\n${instructions}\n` : ''}

RECORDATORIO: Usa datos realistas y formato de tablas correcto.
`
  },

  business_proposal: {
    name: 'Propuesta de Negocio',
    description: 'Propuesta comercial persuasiva y profesional',
    sections: ['Resumen', 'Problema', 'Solucion', 'Beneficios', 'Inversion', 'Implementacion', 'Conclusiones'],
    generatePrompt: (topic, instructions) => `
Genera una propuesta de negocio PERSUASIVA y PROFESIONAL sobre: "${topic}"

${FORMATTING_INSTRUCTIONS}

ESTRUCTURA:

# Propuesta: ${topic}

## Resumen Ejecutivo
Sintetiza propuesta, problema, beneficios, inversion y ROI (150 palabras).

## Situacion Actual / Problema
Define el contexto, problematica identificada y consecuencias de no actuar.

## Solucion Propuesta
Explica la solucion detalladamente (3 parrafos).
Lista caracteristicas principales y diferenciadores clave.

## Beneficios
Presenta beneficios tangibles en tabla con valor estimado y plazo.
Lista beneficios intangibles.
Calcula retorno de inversion (ROI).

## Inversion Requerida
Presenta desglose de costos en tabla.
Incluye opciones de pago y justificacion de la inversion.

## Plan de Implementacion
Describe 4 fases con actividades y entregables.
Presenta cronograma visual en tabla.

## Equipo y Soporte
Describe equipo del proyecto y soporte post-implementacion.

## Riesgos y Mitigacion
Lista 2 riesgos principales con sus planes de mitigacion.

## Conclusiones y Proximos Pasos
Resume valor de la propuesta y define proximos pasos claramente.

## Referencias y Casos de Exito
Incluye testimonios o casos similares exitosos.

${instructions ? `\n\nINSTRUCCIONES ADICIONALES:\n${instructions}\n` : ''}

RECORDATORIO: Manten tono profesional pero persuasivo. Usa tablas correctamente.
`
  }
};

/**
 * Generar reporte desde plantilla (ENDPOINT PRINCIPAL)
 */
const generateFromTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { templateId, topic, additionalInstructions = '', metadata = {} } = req.body;

    console.log('[REPORT] Iniciando generacion de reporte');
    console.log('[REPORT] Template:', templateId, '| Topic:', topic?.substring(0, 50));

    // Validar entrada
    if (!templateId || !topic) {
      return res.status(400).json({
        success: false,
        message: 'templateId y topic son requeridos'
      });
    }

    // Validar plantilla
    const template = TEMPLATE_PROMPTS[templateId];
    if (!template) {
      return res.status(400).json({
        success: false,
        message: 'Plantilla no encontrada',
        availableTemplates: Object.keys(TEMPLATE_PROMPTS)
      });
    }

    console.log('[REPORT] Plantilla seleccionada:', template.name);

    // Generar prompt y solicitar contenido a Gemini
    const prompt = template.generatePrompt(topic, additionalInstructions);
    
    console.log('[REPORT] Solicitando contenido a Gemini AI...');
    const geminiResponse = await geminiClient.generateContent(prompt, {
      temperature: 0.7,
      maxOutputTokens: 8000
    });

    const content = geminiResponse.text;
    console.log('[REPORT] Contenido generado exitosamente');
    console.log('[REPORT] Longitud:', content.length, 'caracteres');

    // Verificar si hay URLs de imagenes
    const hasImages = exportDOCXService.detectImageUrls(content);
    console.log('[REPORT] URLs de imagenes detectadas:', hasImages ? 'SI' : 'NO');

    // Preparar metadata completa
    const fullMetadata = {
      topic: topic,
      student: metadata.student || req.user.nombreCompleto || req.user.username,
      studentId: metadata.studentId || req.user.numeroControl || '',
      author: req.user.username,
      template: templateId,
      templateName: template.name,
      generatedBy: 'Gemini AI',
      generatedAt: new Date().toISOString(),
      school: metadata.school || 'Tecnologico Nacional de Mexico - Campus Ensenada',
      faculty: metadata.faculty || '',
      subject: metadata.subject || '',
      professor: metadata.professor || '',
      group: metadata.group || '',
      ...metadata
    };

    // Generar documento DOCX
    console.log('[REPORT] Generando documento DOCX...');
    const docxBuffer = await exportDOCXService.generateReportFromTemplate({
      templateId: templateId,
      content: content,
      metadata: fullMetadata,
      additionalInstructions: additionalInstructions,
      images: []
    });

    console.log('[REPORT] Documento generado:', {
      size: docxBuffer.length,
      sizeKB: (docxBuffer.length / 1024).toFixed(2) + ' KB',
      hasImages: hasImages
    });

    // Preparar respuesta
    const cleanTopic = topic
      .substring(0, 50)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const filename = `${templateId}_${cleanTopic}_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    console.log('[REPORT] Enviando documento:', filename);
    res.send(docxBuffer);

  } catch (error) {
    console.error('[REPORT] Error en generateFromTemplate:', error);
    console.error('[REPORT] Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Error generando reporte',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
};

/**
 * Obtener plantillas disponibles
 */
const getReportTemplates = async (req, res, next) => {
  try {
    const templates = Object.entries(TEMPLATE_PROMPTS).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      sections: template.sections,
      icon: getTemplateIcon(id)
    }));

    res.json({
      success: true,
      data: {
        templates,
        total: templates.length
      }
    });
  } catch (error) {
    console.error('[REPORT] Error en getReportTemplates:', error);
    next(error);
  }
};

/**
 * Exportar conversacion como DOCX
 */
const exportConversationDOCX = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    console.log('[REPORT] Exportando conversacion:', conversationId);

    // Obtener conversacion
    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversacion no encontrada'
      });
    }

    // Obtener mensajes
    const messages = await messageService.getMessagesByConversation(conversationId);

    // Generar contenido en markdown
    let content = `# ${conversation.title}\n\n`;
    content += `**Fecha de creacion:** ${new Date(conversation.createdAt).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}\n\n`;
    content += `---\n\n`;

    messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
      content += `## ${role}\n\n`;
      content += `${msg.content}\n\n`;
      
      if (index < messages.length - 1) {
        content += `---\n\n`;
      }
    });

    // Generar DOCX
    const docxBuffer = await exportDOCXService.generateReportFromTemplate({
      templateId: 'executive_summary',
      content: content,
      metadata: {
        topic: conversation.title,
        student: req.user.nombreCompleto || req.user.username,
        school: 'Tecnologico Nacional de Mexico - Campus Ensenada',
        date: new Date().toLocaleDateString('es-MX')
      }
    });

    const filename = `conversacion_${conversationId}_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    console.log('[REPORT] Conversacion exportada exitosamente');
    res.send(docxBuffer);

  } catch (error) {
    console.error('[REPORT] Error en exportConversationDOCX:', error);
    next(error);
  }
};

/**
 * Generar reporte basico
 */
const generateReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { prompt, title, metadata = {} } = req.body;

    if (!prompt || !title) {
      return res.status(400).json({
        success: false,
        message: 'Prompt y titulo son requeridos'
      });
    }

    console.log('[REPORT] Generando reporte basico:', title);

    const enhancedPrompt = `${FORMATTING_INSTRUCTIONS}\n\n${prompt}`;

    const geminiResponse = await geminiClient.generateContent(enhancedPrompt, {
      temperature: 0.7,
      maxOutputTokens: 4000
    });

    const content = geminiResponse.text;

    const fullMetadata = {
      topic: title,
      student: metadata.student || req.user.nombreCompleto || req.user.username,
      author: req.user.username,
      generatedBy: 'Gemini AI',
      ...metadata
    };

    const docxBuffer = await exportDOCXService.generateReportFromTemplate({
      templateId: 'research_paper',
      content: content,
      metadata: fullMetadata
    });

    const filename = `reporte_${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    console.log('[REPORT] Reporte basico generado');
    res.send(docxBuffer);
    
  } catch (error) {
    console.error('[REPORT] Error en generateReport:', error);
    next(error);
  }
};

/**
 * Generar y guardar reporte
 */
const generateAndSaveReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { prompt, title, metadata = {} } = req.body;

    if (!prompt || !title) {
      return res.status(400).json({
        success: false,
        message: 'Prompt y titulo son requeridos'
      });
    }

    console.log('[REPORT] Generando y guardando reporte:', title);

    const enhancedPrompt = `${FORMATTING_INSTRUCTIONS}\n\n${prompt}`;

    const geminiResponse = await geminiClient.generateContent(enhancedPrompt, {
      temperature: 0.7,
      maxOutputTokens: 4000
    });

    const content = geminiResponse.text;

    // Crear conversacion
    const conversation = await conversationService.createConversation({
      userId,
      title: `Reporte: ${title}`,
      tags: ['reporte', 'generado']
    });

    await messageService.createMessage({
      conversationId: conversation._id,
      role: 'user',
      content: prompt,
      type: 'text'
    });

    await messageService.createMessage({
      conversationId: conversation._id,
      role: 'assistant',
      content: content,
      type: 'text',
      tokens: geminiResponse.tokens
    });

    const fullMetadata = {
      topic: title,
      student: metadata.student || req.user.nombreCompleto || req.user.username,
      author: req.user.username,
      generatedBy: 'Gemini AI',
      ...metadata
    };

    const docxBuffer = await exportDOCXService.generateReportFromTemplate({
      templateId: 'research_paper',
      content: content,
      metadata: fullMetadata
    });

    const filename = `reporte_${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
    await exportDOCXService.saveDocument(docxBuffer, filename);

    console.log('[REPORT] Reporte guardado:', filename);

    res.json({
      success: true,
      message: 'Reporte generado y guardado exitosamente',
      data: {
        conversationId: conversation._id,
        filename,
        contentPreview: content.substring(0, 200) + '...',
        tokens: geminiResponse.tokens
      }
    });
    
  } catch (error) {
    console.error('[REPORT] Error en generateAndSaveReport:', error);
    next(error);
  }
};

/**
 * Vista previa de markdown
 */
const previewMarkdown = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content es requerido'
      });
    }

    console.log('[REPORT] Generando preview de markdown...');

    const { processedContent, documentStructure } = 
      exportDOCXService.processMarkdownContent(content);

    res.json({
      success: true,
      data: {
        processedContent,
        documentStructure,
        preview: {
          title: processedContent.title,
          sections: Object.keys(processedContent).filter(
            key => processedContent[key] && key !== 'title'
          ),
          totalStructureItems: documentStructure.length
        }
      }
    });
    
  } catch (error) {
    console.error('[REPORT] Error en previewMarkdown:', error);
    next(error);
  }
};

/**
 * Helper: Obtener icono para plantilla
 */
function getTemplateIcon(templateId) {
  const icons = {
    research_paper: 'book',
    technical_report: 'settings',
    executive_summary: 'chart-bar',
    market_analysis: 'trending-up',
    business_proposal: 'briefcase'
  };
  return icons[templateId] || 'file-text';
}

// Exportar todas las funciones
module.exports = {
  generateFromTemplate,
  getReportTemplates,
  exportConversationDOCX,
  generateReport,
  generateAndSaveReport,
  previewMarkdown
};