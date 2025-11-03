// src/controllers/report.controller.js

const geminiClient = require('../services/gemini/geminiClient.service');
const exportDOCXService = require('../services/utils/exportDOCX.service');
const conversationService = require('../services/database/conversation.service');
const messageService = require('../services/database/message.service');

/**
 * Generar reporte con Gemini y exportar a DOCX
 */
const generateReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { prompt, title, includeImages = false, imageUrls = [], metadata = {} } = req.body;

    if (!prompt || !title) {
      return res.status(400).json({
        success: false,
        message: 'Prompt y titulo son requeridos'
      });
    }

    console.log('Generando contenido con Gemini...');
    const geminiResponse = await geminiClient.generateContent(prompt, {
      temperature: 0.7,
      maxOutputTokens: 4000
    });

    const content = geminiResponse.text;
    const tokens = await geminiClient.countTokens(content);

    metadata.author = metadata.author || req.user.username;
    metadata.generatedBy = 'Gemini AI';
    metadata.userId = userId;

    // Informacion academica opcional
    const academicInfo = {
      student: metadata.student || metadata.author,
      studentId: metadata.studentId,
      school: metadata.school,
      faculty: metadata.faculty,
      subject: metadata.subject,
      professor: metadata.professor,
      group: metadata.group,
      presentedBy: true
    };

    console.log('Creando documento DOCX...');
    const docxBuffer = await exportDOCXService.generateReport({
      title,
      content,
      images: includeImages ? imageUrls : [],
      metadata: { ...metadata, ...academicInfo }
    });

    const filename = exportDOCXService.generateFileName(title);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    res.send(docxBuffer);
  } catch (error) {
    console.error('Error en generateReport:', error);
    next(error);
  }
};

/**
 * Exportar conversacion como documento Word
 */
const exportConversationDOCX = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { 
      includeMetadata = true, 
      includeImages = true, 
      includeCover = true 
    } = req.query;

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

    const messages = await messageService.getMessagesByConversation(conversationId);

    const docxBuffer = await exportDOCXService.generateDOCX({
      conversation,
      messages,
      user: req.user,
      config: {
        includeMetadata: includeMetadata === 'true' || includeMetadata === true,
        includeImages: includeImages === 'true' || includeImages === true,
        includeCover: includeCover === 'true' || includeCover === true
      }
    });

    const filename = `conversacion_${conversationId}_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    res.send(docxBuffer);
  } catch (error) {
    console.error('Error en exportConversationDOCX:', error);
    next(error);
  }
};

/**
 * Generar reporte, guardarlo y crear conversacion
 */
const generateAndSaveReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { prompt, title, includeImages = false, imageUrls = [], metadata = {} } = req.body;

    if (!prompt || !title) {
      return res.status(400).json({
        success: false,
        message: 'Prompt y titulo son requeridos'
      });
    }

    const geminiResponse = await geminiClient.generateContent(prompt, {
      temperature: 0.7,
      maxOutputTokens: 4000
    });

    const content = geminiResponse.text;
    const tokens = await geminiClient.countTokens(content);

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
      tokens: tokens
    });

    metadata.author = metadata.author || req.user.username;
    metadata.generatedBy = 'Gemini AI';

    const docxBuffer = await exportDOCXService.generateReport({
      title,
      content,
      images: includeImages ? imageUrls : [],
      metadata
    });

    const filename = exportDOCXService.generateFileName(title);
    await exportDOCXService.saveDocument(docxBuffer, filename);

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
    console.error('Error en generateAndSaveReport:', error);
    next(error);
  }
};

/**
 * Obtener plantillas de reportes disponibles
 */
const getReportTemplates = async (req, res, next) => {
  try {
    const templates = [
      {
        id: 'executive_summary',
        name: 'Resumen Ejecutivo',
        description: 'Reporte ejecutivo con resumen de puntos clave',
        promptTemplate: 'Genera un resumen ejecutivo sobre: {topic}. Incluye: introduccion, puntos clave, analisis y conclusiones.',
        sections: ['Introduccion', 'Puntos Clave', 'Analisis', 'Conclusiones']
      },
      {
        id: 'market_analysis',
        name: 'Analisis de Mercado',
        description: 'Analisis detallado de mercado',
        promptTemplate: 'Genera un analisis de mercado sobre: {topic}. Incluye: panorama actual, tendencias, oportunidades, amenazas y recomendaciones.',
        sections: ['Panorama Actual', 'Tendencias', 'Oportunidades', 'Amenazas', 'Recomendaciones']
      },
      {
        id: 'technical_report',
        name: 'Reporte Tecnico',
        description: 'Documentacion tecnica detallada',
        promptTemplate: 'Genera un reporte tecnico sobre: {topic}. Incluye: especificaciones, arquitectura, implementacion y mejores practicas.',
        sections: ['Especificaciones', 'Arquitectura', 'Implementacion', 'Mejores Practicas']
      },
      {
        id: 'research_paper',
        name: 'Documento de Investigacion',
        description: 'Paper de investigacion academico',
        promptTemplate: 'Genera un documento de investigacion sobre: {topic}. Incluye: abstract, introduccion, metodologia, resultados y conclusiones.',
        sections: ['Abstract', 'Introduccion', 'Metodologia', 'Resultados', 'Conclusiones']
      },
      {
        id: 'business_proposal',
        name: 'Propuesta de Negocio',
        description: 'Propuesta comercial profesional',
        promptTemplate: 'Genera una propuesta de negocio sobre: {topic}. Incluye: resumen, objetivos, solucion propuesta, beneficios y costos.',
        sections: ['Resumen', 'Objetivos', 'Solucion', 'Beneficios', 'Costos']
      }
    ];

    res.json({
      success: true,
      data: {
        templates,
        total: templates.length
      }
    });
  } catch (error) {
    console.error('Error en getReportTemplates:', error);
    next(error);
  }
};

/**
 * Generar reporte desde plantilla
 */
const generateFromTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { templateId, topic, additionalInstructions = '', includeImages = false, imageUrls = [] } = req.body;

    console.log('Datos recibidos:', { templateId, topic, additionalInstructions });

    if (!templateId || !topic) {
      return res.status(400).json({
        success: false,
        message: 'templateId y topic son requeridos'
      });
    }

    const templates = {
      executive_summary: 'Genera un resumen ejecutivo sobre: {topic}. Incluye: introduccion, puntos clave, analisis y conclusiones.',
      market_analysis: 'Genera un analisis de mercado sobre: {topic}. Incluye: panorama actual, tendencias, oportunidades, amenazas y recomendaciones.',
      technical_report: 'Genera un reporte tecnico sobre: {topic}. Incluye: especificaciones, arquitectura, implementacion y mejores practicas.',
      research_paper: 'Genera un documento de investigacion sobre: {topic}. Incluye: abstract, introduccion, metodologia, resultados y conclusiones.',
      business_proposal: 'Genera una propuesta de negocio sobre: {topic}. Incluye: resumen, objetivos, solucion propuesta, beneficios y costos.'
    };

    const promptTemplate = templates[templateId];

    if (!promptTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Plantilla no encontrada. Plantillas disponibles: ' + Object.keys(templates).join(', ')
      });
    }

    let prompt = promptTemplate.replace('{topic}', topic);
    
    if (additionalInstructions) {
      prompt += `\n\nInstrucciones adicionales: ${additionalInstructions}`;
    }

    console.log('Generando con prompt:', prompt);

    const geminiResponse = await geminiClient.generateContent(prompt, {
      temperature: 0.7,
      maxOutputTokens: 4000
    });

    const content = geminiResponse.text;

    const metadata = {
      author: req.user.username,
      template: templateId,
      topic: topic
    };

    const docxBuffer = await exportDOCXService.generateReport({
      title: topic,
      content,
      images: includeImages ? imageUrls : [],
      metadata
    });

    const filename = exportDOCXService.generateFileName(topic);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    res.send(docxBuffer);
  } catch (error) {
    console.error('Error en generateFromTemplate:', error);
    next(error);
  }
};

module.exports = {
  generateReport,
  exportConversationDOCX,
  generateAndSaveReport,
  getReportTemplates,
  generateFromTemplate
};