// src/routes/api/report.routes.js

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/auth/authenticate');
const { asyncHandler } = require('../../middlewares/asyncHandler');
const { geminiLimiter } = require('../../middlewares/rateLimiter');

const {
  generateReport,
  exportConversationDOCX,
  generateAndSaveReport,
  getReportTemplates,
  generateFromTemplate
} = require('../../controllers/report.controller');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Generación de reportes universitarios profesionales con Gemini AI y exportación a DOCX
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AcademicMetadata:
 *       type: object
 *       description: Información académica para la portada del reporte
 *       properties:
 *         school:
 *           type: string
 *           description: Nombre de la universidad o institución
 *           example: Universidad Nacional Autónoma de México
 *         faculty:
 *           type: string
 *           description: Facultad o departamento
 *           example: Facultad de Ingeniería
 *         subject:
 *           type: string
 *           description: Nombre de la materia o asignatura
 *           example: Sistemas Distribuidos
 *         student:
 *           type: string
 *           description: Nombre completo del estudiante
 *           example: Juan Pérez García
 *         studentId:
 *           type: string
 *           description: Matrícula o número de estudiante
 *           example: 418012345
 *         professor:
 *           type: string
 *           description: Nombre del profesor o tutor
 *           example: Dr. Carlos Martínez
 *         group:
 *           type: string
 *           description: Grupo o sección
 *           example: 3CV11
 *         author:
 *           type: string
 *           description: Autor del documento (se usa el username si no se especifica)
 *           example: Juan Pérez
 *     
 *     ReportTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: executive_summary
 *         name:
 *           type: string
 *           example: Resumen Ejecutivo
 *         description:
 *           type: string
 *           example: Reporte ejecutivo con resumen de puntos clave
 *         promptTemplate:
 *           type: string
 *           example: Genera un resumen ejecutivo sobre {topic}...
 *         sections:
 *           type: array
 *           items:
 *             type: string
 *           example: [Introducción, Puntos Clave, Análisis, Conclusiones]
 */

/**
 * @swagger
 * /api/reports/generate:
 *   post:
 *     summary: Generar reporte personalizado con Gemini AI
 *     description: |
 *       Genera un reporte profesional completo usando Gemini AI y lo descarga en formato Word (.docx).
 *       
 *       **Estructura del documento generado:**
 *       1. Portada profesional universitaria
 *       2. Índice (tabla de contenidos)
 *       3. Introducción
 *       4. Desarrollo (contenido principal)
 *       5. Figuras y gráficos (si se incluyen imágenes)
 *       6. Conclusiones
 *       7. Referencias bibliográficas
 *       
 *       **Formato profesional:**
 *       - Márgenes de 1 pulgada
 *       - Interlineado 1.5
 *       - Texto justificado
 *       - Estilos de heading coherentes
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - title
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Instrucciones detalladas para generar el reporte
 *                 example: Genera un análisis exhaustivo sobre las tendencias de Inteligencia Artificial en 2024, incluyendo GPT-4, Claude y Gemini. Incluye introducción, desarrollo detallado con ejemplos, y conclusiones fundamentadas.
 *               title:
 *                 type: string
 *                 description: Título del reporte (aparecerá en la portada)
 *                 example: Tendencias de Inteligencia Artificial 2024
 *               includeImages:
 *                 type: boolean
 *                 description: Si debe incluir imágenes en el documento
 *                 default: false
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs de imágenes a incluir (PNG, JPG)
 *                 example: ["https://example.com/grafico1.png", "https://example.com/grafico2.png"]
 *               metadata:
 *                 $ref: '#/components/schemas/AcademicMetadata'
 *           examples:
 *             reporteBasico:
 *               summary: Reporte básico sin información académica
 *               value:
 *                 prompt: Genera un análisis sobre blockchain en finanzas
 *                 title: Blockchain en Finanzas
 *                 includeImages: false
 *                 metadata:
 *                   author: Juan Pérez
 *             reporteUniversitario:
 *               summary: Reporte universitario completo
 *               value:
 *                 prompt: Genera un reporte sobre computación cuántica, incluyendo introducción, fundamentos teóricos, aplicaciones actuales y conclusiones
 *                 title: Computación Cuántica - Fundamentos y Aplicaciones
 *                 includeImages: false
 *                 metadata:
 *                   school: Universidad Nacional Autónoma de México
 *                   faculty: Facultad de Ciencias
 *                   subject: Física Cuántica Avanzada
 *                   student: María García López
 *                   studentId: 317045678
 *                   professor: Dr. Roberto Sánchez
 *                   group: 5FM2
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente - Descarga automática del archivo .docx
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename="blockchain-en-finanzas_1699999999999.docx"
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Datos inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Prompt y título son requeridos
 *       401:
 *         description: No autorizado - Token inválido o no proporcionado
 *       429:
 *         description: Demasiadas peticiones - Límite de tasa excedido
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/generate',
  authenticate,
  geminiLimiter,
  asyncHandler(generateReport)
);

/**
 * @swagger
 * /api/reports/generate-from-template:
 *   post:
 *     summary: Generar reporte desde plantilla predefinida
 *     description: |
 *       Genera un reporte usando una plantilla profesional predefinida.
 *       
 *       **Plantillas disponibles:**
 *       - `executive_summary` - Resumen ejecutivo profesional
 *       - `market_analysis` - Análisis de mercado detallado
 *       - `technical_report` - Documentación técnica
 *       - `research_paper` - Paper de investigación académico
 *       - `business_proposal` - Propuesta de negocio
 *       
 *       Cada plantilla incluye estructura predefinida y genera automáticamente:
 *       portada, índice, introducción, desarrollo, conclusiones y referencias.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - topic
 *             properties:
 *               templateId:
 *                 type: string
 *                 enum: [executive_summary, market_analysis, technical_report, research_paper, business_proposal]
 *                 description: ID de la plantilla a utilizar
 *                 example: research_paper
 *               topic:
 *                 type: string
 *                 description: Tema principal del reporte
 *                 example: Implementación de Blockchain en el sector financiero
 *               additionalInstructions:
 *                 type: string
 *                 description: Instrucciones adicionales opcionales para personalizar el contenido
 *                 example: Enfócate en casos de uso en Latinoamérica y regulaciones locales
 *               includeImages:
 *                 type: boolean
 *                 default: false
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 $ref: '#/components/schemas/AcademicMetadata'
 *           examples:
 *             researchPaper:
 *               summary: Paper de investigación universitario
 *               value:
 *                 templateId: research_paper
 *                 topic: Impacto del Machine Learning en la Medicina Moderna
 *                 additionalInstructions: Incluye casos de estudio recientes y estadísticas
 *                 metadata:
 *                   school: Instituto Tecnológico de Estudios Superiores
 *                   faculty: Escuela de Medicina
 *                   subject: Tecnologías Médicas Emergentes
 *                   student: Carlos Rodríguez
 *                   studentId: 720134567
 *                   professor: Dra. Ana Martínez
 *                   group: 7MED-A
 *             executiveSummary:
 *               summary: Resumen ejecutivo empresarial
 *               value:
 *                 templateId: executive_summary
 *                 topic: Estrategia Digital para PYMES 2024
 *                 additionalInstructions: Enfoque en transformación digital post-pandemia
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente desde plantilla
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Plantilla no encontrada o datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Plantilla no encontrada. Plantillas disponibles executive_summary, market_analysis, technical_report, research_paper, business_proposal
 *       401:
 *         description: No autorizado
 *       429:
 *         description: Límite de tasa excedido
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/generate-from-template',
  authenticate,
  geminiLimiter,
  asyncHandler(generateFromTemplate)
);

/**
 * @swagger
 * /api/reports/templates:
 *   get:
 *     summary: Obtener plantillas de reportes disponibles
 *     description: |
 *       Lista todas las plantillas predefinidas disponibles para generar reportes profesionales.
 *       
 *       Cada plantilla incluye:
 *       - ID único para su uso
 *       - Nombre descriptivo
 *       - Descripción del tipo de reporte
 *       - Estructura de secciones
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de plantillas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     templates:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ReportTemplate'
 *                     total:
 *                       type: number
 *                       example: 5
 *             example:
 *               success: true
 *               data:
 *                 templates:
 *                   - id: executive_summary
 *                     name: Resumen Ejecutivo
 *                     description: Reporte ejecutivo con resumen de puntos clave
 *                     sections: [Introducción, Puntos Clave, Análisis, Conclusiones]
 *                   - id: research_paper
 *                     name: Documento de Investigación
 *                     description: Paper de investigación académico
 *                     sections: [Abstract, Introducción, Metodología, Resultados, Conclusiones]
 *                 total: 5
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get(
  '/templates',
  authenticate,
  asyncHandler(getReportTemplates)
);

/**
 * @swagger
 * /api/reports/generate-and-save:
 *   post:
 *     summary: Generar reporte, guardarlo en servidor y crear conversación
 *     description: |
 *       Genera un reporte, lo guarda en el servidor y crea una conversación asociada
 *       para futura referencia. El archivo queda almacenado en el servidor.
 *       
 *       **Útil para:**
 *       - Mantener historial de reportes generados
 *       - Referencias futuras
 *       - Auditoría de generación de contenido
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - title
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Genera un análisis de mercado sobre blockchain en finanzas
 *               title:
 *                 type: string
 *                 example: Blockchain en Finanzas 2024
 *               includeImages:
 *                 type: boolean
 *                 default: false
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 $ref: '#/components/schemas/AcademicMetadata'
 *     responses:
 *       200:
 *         description: Reporte generado y guardado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reporte generado y guardado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversationId:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     filename:
 *                       type: string
 *                       example: blockchain-en-finanzas-2024_1699999999999.docx
 *                     contentPreview:
 *                       type: string
 *                       example: Introducción al uso de blockchain...
 *                     tokens:
 *                       type: number
 *                       example: 2500
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/generate-and-save',
  authenticate,
  geminiLimiter,
  asyncHandler(generateAndSaveReport)
);

/**
 * @swagger
 * /api/reports/conversation/{conversationId}/docx:
 *   get:
 *     summary: Exportar conversación existente como documento Word profesional
 *     description: |
 *       Convierte una conversación completa a un documento Word con formato profesional.
 *       
 *       **El documento incluye:**
 *       - Portada opcional
 *       - Metadata de la conversación
 *       - Todos los mensajes (usuario y asistente)
 *       - Imágenes adjuntas (opcional)
 *       - Marca temporal de cada mensaje
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversación a exportar
 *         example: 507f1f77bcf86cd799439011
 *       - in: query
 *         name: includeMetadata
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir información de metadata (ID, fechas, tokens)
 *       - in: query
 *         name: includeImages
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir imágenes adjuntas en el documento
 *       - in: query
 *         name: includeCover
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir página de portada profesional
 *     responses:
 *       200:
 *         description: Documento generado exitosamente
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Conversación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Conversación no encontrada
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get(
  '/conversation/:conversationId/docx',
  authenticate,
  asyncHandler(exportConversationDOCX)
);

module.exports = router;