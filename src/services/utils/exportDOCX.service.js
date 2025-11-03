// src/services/utils/exportDOCX.service.js

const fs = require('fs').promises;
const path = require('path');
const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  Table, 
  TableCell, 
  TableRow, 
  WidthType, 
  BorderStyle, 
  ImageRun,
  PageBreak
} = require('docx');
const https = require('https');
const http = require('http');

class ExportDOCXService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../exports/docx');
  }

  /**
   * Genera reporte personalizado con Gemini - FORMATO UNIVERSITARIO
   */
  async generateReport({ title, content, images = [], metadata = {} }) {
    try {
      const sections = [];

      // 1. PORTADA PROFESIONAL UNIVERSITARIA
      sections.push(...this.createUniversityCoverPage(title, metadata));
      sections.push(new Paragraph({ children: [new PageBreak()] }));

      // 2. ÍNDICE
      sections.push(...this.createTableOfContentsPage());
      sections.push(new Paragraph({ children: [new PageBreak()] }));

      // 3. INTRODUCCIÓN
      const structuredContent = this.parseContentStructure(content);
      sections.push(...this.createIntroductionSection(structuredContent.introduction || title));
      
      // 4. DESARROLLO/CONTENIDO PRINCIPAL
      sections.push(new Paragraph({ children: [new PageBreak()] }));
      sections.push(
        new Paragraph({
          text: 'DESARROLLO',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 300 }
        })
      );

      const contentParagraphs = this.parseMarkdownToParagraphs(structuredContent.mainContent || content);
      sections.push(...contentParagraphs);

      // 5. IMÁGENES (si existen)
      if (images && images.length > 0) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
        sections.push(
          new Paragraph({
            text: 'FIGURAS Y GRÁFICOS',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 300 }
          })
        );

        for (let i = 0; i < images.length; i++) {
          try {
            const imageBuffer = await this.downloadImage(images[i]);
            sections.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 500,
                      height: 375
                    }
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 100 }
              })
            );
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Figura ${i + 1}`,
                    italics: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 }
              })
            );
          } catch (error) {
            console.error(`Error descargando imagen ${i + 1}:`, error.message);
            // Continuar sin la imagen
          }
        }
      }

      // 6. CONCLUSIONES
      sections.push(new Paragraph({ children: [new PageBreak()] }));
      sections.push(...this.createConclusionsSection(structuredContent.conclusions));

      // 7. REFERENCIAS BIBLIOGRÁFICAS
      sections.push(new Paragraph({ children: [new PageBreak()] }));
      sections.push(...this.createReferencesSection(structuredContent.references, metadata));

      // Crear documento con configuración correcta
      const doc = new Document({
        creator: metadata.author || 'Gemini AI Report Generator',
        title: title,
        description: 'Reporte generado con Gemini AI',
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1440,
                right: 1440
              }
            }
          },
          children: sections
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      console.error('Error en generateReport:', error);
      throw new Error(`Error generando reporte: ${error.message}`);
    }
  }

  /**
   * Crea portada universitaria profesional
   */
  createUniversityCoverPage(title, metadata) {
    const sections = [];

    // LOGO O NOMBRE DE LA UNIVERSIDAD (arriba)
    if (metadata.school) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.school.toUpperCase(),
              bold: true,
              size: 32,
              color: '1a1a1a'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100 }
        })
      );
    }

    if (metadata.faculty) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.faculty.toUpperCase(),
              size: 26,
              color: '4a4a4a'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Línea decorativa
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            color: '2E5090'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Espacio
    sections.push(
      new Paragraph({
        text: '',
        spacing: { after: 800 }
      })
    );

    // TÍTULO DEL TRABAJO
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 52,
            color: '2E5090'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 }
      })
    );

    // Línea decorativa
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            color: '2E5090'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 600 }
      })
    );

    // MATERIA/ASIGNATURA
    if (metadata.subject) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.subject,
              size: 28,
              bold: true,
              color: '333333'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Espacio
    sections.push(
      new Paragraph({
        text: '',
        spacing: { after: 1000 }
      })
    );

    // INFORMACIÓN DEL ESTUDIANTE
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Presentado por:',
            bold: true,
            size: 24,
            color: '4a4a4a'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    if (metadata.student || metadata.author) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.student || metadata.author,
              size: 26,
              bold: true,
              color: '1a1a1a'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        })
      );
    }

    if (metadata.studentId) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Matrícula: ${metadata.studentId}`,
              size: 22,
              color: '4a4a4a'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        })
      );
    }

    // PROFESOR
    if (metadata.professor) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Profesor:',
              bold: true,
              size: 22,
              color: '4a4a4a'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        })
      );
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.professor,
              size: 24,
              color: '1a1a1a'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        })
      );
    }

    // GRUPO
    if (metadata.group) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Grupo: ${metadata.group}`,
              size: 22,
              color: '4a4a4a'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );
    }

    // Espacio final
    sections.push(
      new Paragraph({
        text: '',
        spacing: { after: 600 }
      })
    );

    // FECHA
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            size: 24,
            italics: true,
            color: '4a4a4a'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 }
      })
    );

    return sections;
  }

  /**
   * Crea página de índice
   */
  createTableOfContentsPage() {
    const sections = [];

    sections.push(
      new Paragraph({
        text: 'ÍNDICE',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 }
      })
    );

    const tocItems = [
      'Introducción',
      'Desarrollo', 
      'Conclusiones',
      'Referencias Bibliográficas'
    ];

    tocItems.forEach((item, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${item}`,
              size: 24
            })
          ],
          spacing: { after: 150, before: 100 }
        })
      );
    });

    return sections;
  }

  /**
   * Crea sección de introducción
   */
  createIntroductionSection(topic) {
    const sections = [];

    sections.push(
      new Paragraph({
        text: 'INTRODUCCIÓN',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 300 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `El presente trabajo tiene como objetivo abordar el tema de "${topic}", proporcionando un análisis detallado y fundamentado sobre sus aspectos más relevantes.`,
            size: 24
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: 360 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'En este documento se desarrollan los conceptos fundamentales, se analizan las principales características y se presentan conclusiones basadas en la información recopilada y procesada.',
            size: 24
          })
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: 360 }
      })
    );

    return sections;
  }

  /**
   * Crea sección de conclusiones
   */
  createConclusionsSection(conclusions) {
    const sections = [];

    sections.push(
      new Paragraph({
        text: 'CONCLUSIONES',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 300 }
      })
    );

    if (conclusions) {
      const conclusionParagraphs = this.parseMarkdownToParagraphs(conclusions);
      sections.push(...conclusionParagraphs);
    } else {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'A lo largo de este trabajo se han analizado los aspectos fundamentales del tema presentado, destacando su relevancia e implicaciones en el contexto actual.',
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Los resultados obtenidos permiten comprender mejor la complejidad del tema y proporcionan una base sólida para futuras investigaciones o aplicaciones prácticas.',
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 360 }
        })
      );
    }

    return sections;
  }

  /**
   * Crea sección de referencias bibliográficas
   */
  createReferencesSection(references, metadata) {
    const sections = [];

    sections.push(
      new Paragraph({
        text: 'REFERENCIAS BIBLIOGRÁFICAS',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 300 }
      })
    );

    const defaultReferences = [
      `${metadata.generatedBy || 'Gemini AI'}. (2024). Modelo de lenguaje de inteligencia artificial. Google DeepMind.`,
      'Material de referencia académica proporcionado por el curso.'
    ];

    const finalReferences = references || defaultReferences;

    finalReferences.forEach((ref, index) => {
      const refText = typeof ref === 'string' ? ref : ref.text;
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${index + 1}] `,
              bold: true,
              size: 22
            }),
            new TextRun({
              text: refText,
              size: 22
            })
          ],
          spacing: { after: 200, line: 360 },
          alignment: AlignmentType.JUSTIFIED
        })
      );
    });

    return sections;
  }

  /**
   * Parsea el contenido para extraer estructura
   */
  parseContentStructure(content) {
    const structure = {
      introduction: null,
      mainContent: content,
      conclusions: null,
      references: null
    };

    try {
      // Intentar extraer introducción
      const introMatch = content.match(/#+\s*Introducci[oó]n\s*\n([\s\S]*?)(?=#+|$)/i);
      if (introMatch) {
        structure.introduction = introMatch[1].trim();
      }

      // Intentar extraer conclusiones
      const conclusionMatch = content.match(/#+\s*Conclusi[oó]n(?:es)?\s*\n([\s\S]*?)(?=#+\s*Referencias|$)/i);
      if (conclusionMatch) {
        structure.conclusions = conclusionMatch[1].trim();
      }

      // Intentar extraer referencias
      const referencesMatch = content.match(/#+\s*Referencias(?:\s+Bibliogr[aá]ficas?)?\s*\n([\s\S]*?)$/i);
      if (referencesMatch) {
        const refText = referencesMatch[1].trim();
        structure.references = refText.split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[\-\*\d\.]\s*/, '').trim())
          .filter(line => line.length > 0);
      }
    } catch (error) {
      console.error('Error parseando estructura:', error);
    }

    return structure;
  }

  /**
   * Parsea Markdown a parrafos de Word
   */
  parseMarkdownToParagraphs(content) {
    const paragraphs = [];
    const lines = content.split('\n');
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Code blocks
      if (trimmedLine.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: 'Courier New',
                size: 20
              })
            ],
            spacing: { after: 50 }
          })
        );
        continue;
      }

      // Lineas vacias
      if (trimmedLine === '') {
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { after: 150 }
          })
        );
        continue;
      }

      // Heading 1
      if (trimmedLine.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        );
        continue;
      }

      // Heading 2
      if (trimmedLine.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
          })
        );
        continue;
      }

      // Heading 3
      if (trimmedLine.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 250, after: 100 }
          })
        );
        continue;
      }

      // Listas con bullet
      if (trimmedLine.match(/^[\-\*\+]\s/)) {
        const text = trimmedLine.replace(/^[\-\*\+]\s/, '');
        paragraphs.push(
          new Paragraph({
            text: text,
            bullet: { level: 0 },
            spacing: { after: 100, line: 360 },
            alignment: AlignmentType.JUSTIFIED
          })
        );
        continue;
      }

      // Listas numeradas
      if (trimmedLine.match(/^\d+\.\s/)) {
        const text = trimmedLine.replace(/^\d+\.\s/, '');
        paragraphs.push(
          new Paragraph({
            text: text,
            spacing: { after: 100, line: 360 },
            alignment: AlignmentType.JUSTIFIED
          })
        );
        continue;
      }

      // Texto normal
      const textRuns = this.parseInlineMarkdown(trimmedLine);
      paragraphs.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 150, line: 360 },
          alignment: AlignmentType.JUSTIFIED
        })
      );
    }

    return paragraphs;
  }

  /**
   * Parsea markdown inline
   */
  parseInlineMarkdown(text) {
    const runs = [];
    let currentText = '';
    let i = 0;

    while (i < text.length) {
      // Bold **text**
      if (text.substring(i, i + 2) === '**') {
        if (currentText) {
          runs.push(new TextRun({ text: currentText, size: 24 }));
          currentText = '';
        }
        const endIndex = text.indexOf('**', i + 2);
        if (endIndex !== -1) {
          runs.push(new TextRun({ 
            text: text.substring(i + 2, endIndex),
            bold: true,
            size: 24
          }));
          i = endIndex + 2;
          continue;
        }
      }

      // Italic *text*
      if (text[i] === '*' && text[i + 1] !== '*') {
        if (currentText) {
          runs.push(new TextRun({ text: currentText, size: 24 }));
          currentText = '';
        }
        const endIndex = text.indexOf('*', i + 1);
        if (endIndex !== -1 && text[endIndex + 1] !== '*') {
          runs.push(new TextRun({ 
            text: text.substring(i + 1, endIndex),
            italics: true,
            size: 24
          }));
          i = endIndex + 1;
          continue;
        }
      }

      // Inline code `text`
      if (text[i] === '`') {
        if (currentText) {
          runs.push(new TextRun({ text: currentText, size: 24 }));
          currentText = '';
        }
        const endIndex = text.indexOf('`', i + 1);
        if (endIndex !== -1) {
          runs.push(new TextRun({ 
            text: text.substring(i + 1, endIndex),
            font: 'Courier New',
            size: 20,
            shading: { fill: 'F0F0F0' }
          }));
          i = endIndex + 1;
          continue;
        }
      }

      currentText += text[i];
      i++;
    }

    if (currentText) {
      runs.push(new TextRun({ text: currentText, size: 24 }));
    }

    return runs.length > 0 ? runs : [new TextRun({ text: text, size: 24 })];
  }

  /**
   * Descarga imagen desde URL
   */
  async downloadImage(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Genera documento DOCX desde conversación
   */
  async generateDOCX({ conversation, messages, user, config = {} }) {
    try {
      const {
        includeMetadata = true,
        includeImages = true,
        includeCover = true
      } = config;

      const sections = [];

      if (includeCover) {
        sections.push(...this.createUniversityCoverPage(
          conversation.title || 'Conversación Exportada',
          { author: user.username, ...config.academicInfo }
        ));
        sections.push(new Paragraph({ children: [new PageBreak()] }));
      }

      if (includeMetadata) {
        sections.push(...this.createMetadataSection(conversation));
        sections.push(new Paragraph({ children: [new PageBreak()] }));
      }

      for (let i = 0; i < messages.length; i++) {
        const messageSections = await this.createMessageSection(messages[i], i + 1, includeImages);
        sections.push(...messageSections);
      }

      const doc = new Document({
        creator: user.username || 'Gemini Chat',
        title: conversation.title || 'Conversación',
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1440,
                right: 1440
              }
            }
          },
          children: sections
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      console.error('Error en generateDOCX:', error);
      throw new Error(`Error generando DOCX: ${error.message}`);
    }
  }

  createMetadataSection(conversation) {
    const sections = [];

    sections.push(
      new Paragraph({
        text: 'Información del Documento',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    const metadata = [
      ['ID de Conversación', conversation._id?.toString() || 'N/A'],
      ['Fecha de Creación', new Date(conversation.createdAt).toLocaleString('es-ES')],
      ['Última Actualización', new Date(conversation.updatedAt).toLocaleString('es-ES')],
      ['Tokens Utilizados', conversation.tokenUsage?.total?.toLocaleString() || 'N/A']
    ];

    if (conversation.tags && conversation.tags.length > 0) {
      metadata.push(['Tags', conversation.tags.join(', ')]);
    }

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metadata.map(([key, value]) => 
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ text: value })],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ),
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
      }
    });

    sections.push(table);
    sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));

    return sections;
  }

  async createMessageSection(message, index, includeImages) {
    const sections = [];
    const role = message.role === 'user' ? 'Usuario' : 'Asistente';
    const roleColor = message.role === 'user' ? '2E5090' : '0B6623';

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${index}. ${role}`,
            bold: true,
            size: 28,
            color: roleColor
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date(message.createdAt).toLocaleString('es-ES'),
            italics: true,
            size: 20,
            color: '666666'
          })
        ],
        spacing: { after: 200 }
      })
    );

    const contentParagraphs = this.parseMarkdownToParagraphs(message.content);
    sections.push(...contentParagraphs);

    if (message.attachments && message.attachments.length > 0) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Adjuntos:', bold: true })],
          spacing: { before: 200, after: 100 }
        })
      );

      message.attachments.forEach(att => {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: `- ${att.name} (${att.type})` })]
          })
        );
      });
    }

    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    return sections;
  }

  async saveDocument(buffer, filename) {
    try {
      await this.ensureOutputDir();
      const filePath = path.join(this.outputDir, filename);
      await fs.writeFile(filePath, buffer);
      const stats = await fs.stat(filePath);
      return { success: true, filePath, filename, size: stats.size };
    } catch (error) {
      throw new Error(`Error guardando documento: ${error.message}`);
    }
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Error creando directorio: ${error.message}`);
    }
  }

  generateFileName(title) {
    const timestamp = Date.now();
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    return `${cleanTitle}_${timestamp}.docx`;
  }
}

module.exports = new ExportDOCXService();