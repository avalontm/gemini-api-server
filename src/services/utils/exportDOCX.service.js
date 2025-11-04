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
  PageBreak,
  ImageRun,
  TabStopPosition,
  TabStopType,
  LeaderType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip
} = require('docx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const MarkdownIt = require('markdown-it');
const markdownItMultimdTable = require('markdown-it-multimd-table');
const https = require('https');
const http = require('http');

class ExportDOCXService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../exports/docx');
    this.templatesDir = path.join(__dirname, '../../../templates');
    
    this.md = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true,
      typographer: true
    }).use(markdownItMultimdTable, {
      multiline: true,
      rowspan: true,
      headerless: true,
      multibody: true,
      autolabel: true
    });
  }

  async generateReportFromTemplate({ templateId, content, metadata = {}, additionalInstructions = '', images = [] }) {
    try {
      console.log(`[DOCX] Iniciando generacion de reporte con plantilla: ${templateId}`);
      
      // Detectar si hay URLs de imagenes en el contenido
      const hasImageUrls = this.detectImageUrls(content);
      
      let allImages = [...images];
      
      if (hasImageUrls) {
        console.log('[DOCX] URLs de imagenes detectadas en el contenido');
        const extractedImages = await this.extractImagesFromMarkdown(content);
        console.log(`[DOCX] Imagenes extraidas del contenido: ${extractedImages.length}`);
        allImages = [...extractedImages, ...allImages];
      } else {
        console.log('[DOCX] No se detectaron URLs de imagenes en el contenido');
      }
      
      console.log(`[DOCX] Total de imagenes para el documento: ${allImages.length}`);
      
      return await this.generateCompleteDocument({
        templateId,
        content,
        metadata,
        images: allImages
      });
      
    } catch (error) {
      console.error('[DOCX] Error en generateReportFromTemplate:', error);
      throw error;
    }
  }

  /**
   * Detecta si hay URLs de imagenes en el contenido
   */
  detectImageUrls(content) {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Regex para detectar imagenes markdown: ![alt](url)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
    
    // Regex para detectar URLs de imagenes directas
    const directImageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i;
    
    return markdownImageRegex.test(contentStr) || directImageRegex.test(contentStr);
  }

  /**
   * Extrae URLs de imagenes del contenido markdown y las descarga
   */
  async extractImagesFromMarkdown(content) {
    const images = [];
    
    try {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      
      // Regex para detectar imagenes markdown: ![alt](url)
      const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      
      // Regex para detectar URLs de imagenes directas
      const directImageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
      
      let match;
      const imageUrls = new Set();
      
      // Extraer imagenes en formato markdown
      while ((match = markdownImageRegex.exec(contentStr)) !== null) {
        const alt = match[1] || 'Imagen';
        const url = match[2];
        imageUrls.add(JSON.stringify({ url, alt, type: 'markdown' }));
        console.log(`[DOCX] Imagen markdown detectada: ${alt} -> ${url}`);
      }
      
      // Extraer URLs directas de imagenes
      while ((match = directImageRegex.exec(contentStr)) !== null) {
        const url = match[0];
        const urlStr = JSON.stringify({ url, alt: 'Imagen', type: 'direct' });
        imageUrls.add(urlStr);
        console.log(`[DOCX] URL de imagen directa detectada: ${url}`);
      }
      
      // Descargar todas las imagenes detectadas
      for (const imgDataStr of imageUrls) {
        const imgData = JSON.parse(imgDataStr);
        try {
          console.log(`[DOCX] Descargando imagen: ${imgData.url}`);
          const buffer = await this.downloadImage(imgData.url);
          
          images.push({
            data: buffer,
            width: 500,
            height: 375,
            caption: imgData.alt,
            type: imgData.type
          });
          
          console.log(`[DOCX] Imagen descargada exitosamente: ${imgData.alt}`);
        } catch (error) {
          console.error(`[DOCX] Error descargando imagen ${imgData.url}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('[DOCX] Error extrayendo imagenes del markdown:', error);
    }
    
    return images;
  }

  /**
   * Descarga una imagen desde una URL
   */
  async downloadImage(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout descargando imagen'));
      }, 15000);
      
      const protocol = url.startsWith('https') ? https : http;
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };
      
      protocol.get(url, options, (response) => {
        clearTimeout(timeout);
        
        // Manejar redirecciones
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`[DOCX] Redireccion detectada: ${redirectUrl}`);
          return this.downloadImage(redirectUrl).then(resolve).catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Error HTTP ${response.statusCode} descargando imagen`));
          return;
        }

        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[DOCX] Imagen descargada: ${buffer.length} bytes`);
          resolve(buffer);
        });
        response.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }).on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Crea un parrafo con imagen
   */
  createImageParagraph(imageData) {
    try {
      return new Paragraph({
        children: [
          new ImageRun({
            data: imageData.data,
            transformation: {
              width: imageData.width || 500,
              height: imageData.height || 375
            }
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 }
      });
    } catch (error) {
      console.error('[DOCX] Error creando imagen:', error);
      return new Paragraph({
        children: [new TextRun({ text: '[Error cargando imagen]', italics: true })],
        alignment: AlignmentType.CENTER
      });
    }
  }

  /**
   * Crea caption para imagen
   */
  createImageCaption(caption, figureNumber) {
    return new Paragraph({
      children: [
        new TextRun({
          text: `Figura ${figureNumber}: `,
          bold: true,
          size: 20,
          font: 'Calibri'
        }),
        new TextRun({
          text: caption,
          italics: true,
          size: 20,
          font: 'Calibri'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    });
  }

  async loadTemplate(templateId) {
    const templatePath = path.join(this.templatesDir, `${templateId}.docx`);
    const templateBuffer = await fs.readFile(templatePath);
    console.log(`[DOCX] Plantilla ${templateId} cargada`);
    return templateBuffer;
  }

  processMarkdownContent(markdownContent) {
    console.log('[DOCX] Procesando contenido markdown con markdown-it...');
    
    if (typeof markdownContent !== 'string') {
      markdownContent = JSON.stringify(markdownContent);
    }
    
    const sections = {
      title: '',
      abstract: '',
      introduction: '',
      methodology: '',
      results: '',
      discussion: '',
      conclusions: '',
      references: []
    };

    const documentStructure = [];
    let pageCounter = 1;

    const tokens = this.md.parse(markdownContent, {});
    
    console.log(`[DOCX] Tokens parseados: ${tokens.length}`);

    const titleToken = tokens.find(t => t.type === 'heading_open' && t.tag === 'h1');
    if (titleToken) {
      const titleIdx = tokens.indexOf(titleToken);
      const inlineToken = tokens[titleIdx + 1];
      if (inlineToken && inlineToken.type === 'inline') {
        sections.title = inlineToken.content;
        documentStructure.push({ 
          level: 1, 
          title: sections.title, 
          page: pageCounter++,
          type: 'title'
        });
      }
    }

    const sectionTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.substring(1));
        const inlineToken = tokens[i + 1];
        
        if (inlineToken && inlineToken.type === 'inline') {
          const title = inlineToken.content;
          
          let contentTokens = [];
          let j = i + 3;
          
          while (j < tokens.length && tokens[j].type !== 'heading_open') {
            contentTokens.push(tokens[j]);
            j++;
          }
          
          sectionTokens.push({
            level,
            title,
            tokens: contentTokens,
            startIndex: i,
            endIndex: j
          });
          
          documentStructure.push({ 
            level, 
            title, 
            page: pageCounter++,
            type: 'section'
          });
        }
      }
    }

    sectionTokens.forEach(section => {
      const titleLower = section.title.toLowerCase();

      if (titleLower.includes('abstract') || titleLower.includes('resumen')) {
        sections.abstract = section.tokens;
      } else if (titleLower.includes('introduccion') || titleLower.includes('introduction')) {
        sections.introduction = section.tokens;
      } else if (titleLower.includes('metodologia') || titleLower.includes('methodology')) {
        sections.methodology = section.tokens;
      } else if (titleLower.includes('resultado') || titleLower.includes('result')) {
        sections.results = section.tokens;
      } else if (titleLower.includes('discusion') || titleLower.includes('discussion')) {
        sections.discussion = section.tokens;
      } else if (titleLower.includes('conclusion')) {
        sections.conclusions = section.tokens;
      } else if (titleLower.includes('referencia') || titleLower.includes('bibliografia')) {
        sections.references = this.extractReferencesFromTokens(section.tokens);
      }
    });

    if (!sections.introduction && !sections.methodology && !sections.results) {
      sections.introduction = tokens;
    }

    return { processedContent: sections, documentStructure };
  }

  extractReferencesFromTokens(tokens) {
    const references = [];
    
    tokens.forEach(token => {
      if (token.type === 'inline') {
        const trimmed = token.content.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const clean = trimmed.replace(/^[\d\-\*\+\.\)]\s*/, '');
          if (clean) {
            references.push(clean);
          }
        }
      }
    });
    
    if (references.length === 0) {
      return [
        'Material bibliografico proporcionado en el curso.',
        'Recursos digitales y fuentes consultadas.',
        'Gemini AI. (2024). Sistema de generacion de contenido educativo.'
      ];
    }
    
    return references;
  }

  tokensToDocxElements(tokens, images = [], startImageIndex = 0) {
    console.log('[DOCX] Convirtiendo tokens a elementos DOCX...');
    
    const elements = [];
    let i = 0;
    let imageIndex = startImageIndex;
    let figureNumber = startImageIndex + 1;

    console.log(`[DOCX] Total de tokens a procesar: ${tokens.length}`);
    console.log(`[DOCX] Imagenes disponibles para insertar: ${images.length}`);

    while (i < tokens.length) {
      const token = tokens[i];

      // Detectar imagenes markdown en los tokens
      if (token.type === 'inline' && token.children) {
        let hasImage = false;
        
        for (const child of token.children) {
          if (child.type === 'image') {
            console.log(`[DOCX] Token de imagen detectado: ${child.attrGet('src')}`);
            
            if (imageIndex < images.length) {
              const img = images[imageIndex];
              elements.push(this.createImageParagraph(img));
              elements.push(this.createImageCaption(
                img.caption || 'Imagen ilustrativa',
                figureNumber++
              ));
              imageIndex++;
              hasImage = true;
            }
          }
        }
        
        if (hasImage) {
          i++;
          continue;
        }
      }

      if (token.type === 'table_open') {
        console.log('[DOCX] Tabla detectada en token index:', i);
        const tableElements = this.processTableTokens(tokens, i);
        if (tableElements.table) {
          elements.push(tableElements.table);
          elements.push(new Paragraph({ 
            text: '', 
            spacing: { before: 200, after: 200 } 
          }));
          i = tableElements.nextIndex;
          continue;
        }
      }

      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.substring(1));
        const inlineToken = tokens[i + 1];
        
        if (inlineToken && inlineToken.type === 'inline') {
          const headingLevel = level === 1 ? HeadingLevel.HEADING_1 :
                               level === 2 ? HeadingLevel.HEADING_2 :
                               level === 3 ? HeadingLevel.HEADING_3 :
                               HeadingLevel.HEADING_4;
          
          elements.push(new Paragraph({
            text: inlineToken.content,
            heading: headingLevel,
            spacing: { 
              before: 240, 
              after: 120 
            },
            alignment: AlignmentType.LEFT
          }));
        }
        
        i += 3;
        continue;
      }

      if (token.type === 'paragraph_open') {
        const inlineToken = tokens[i + 1];
        
        if (inlineToken && inlineToken.type === 'inline') {
          const runs = this.parseInlineTokens(inlineToken.children || []);
          
          if (runs.length > 0) {
            elements.push(new Paragraph({
              children: runs,
              spacing: { before: 0, after: 120, line: 276 },
              alignment: AlignmentType.JUSTIFIED
            }));
          }
        }
        
        i += 3;
        continue;
      }

      if (token.type === 'bullet_list_open') {
        let j = i + 1;
        
        while (j < tokens.length && tokens[j].type !== 'bullet_list_close') {
          if (tokens[j].type === 'list_item_open') {
            const itemInline = tokens[j + 2];
            
            if (itemInline && itemInline.type === 'inline') {
              const runs = this.parseInlineTokens(itemInline.children || []);
              
              if (runs.length > 0) {
                elements.push(new Paragraph({
                  children: runs,
                  bullet: { level: 0 },
                  spacing: { before: 0, after: 60, line: 276 },
                  alignment: AlignmentType.LEFT,
                  indent: { left: 720 }
                }));
              }
            }
            
            j += 5;
          } else {
            j++;
          }
        }
        
        i = j + 1;
        continue;
      }

      if (token.type === 'ordered_list_open') {
        let j = i + 1;
        
        while (j < tokens.length && tokens[j].type !== 'ordered_list_close') {
          if (tokens[j].type === 'list_item_open') {
            const itemInline = tokens[j + 2];
            
            if (itemInline && itemInline.type === 'inline') {
              const runs = this.parseInlineTokens(itemInline.children || []);
              
              if (runs.length > 0) {
                elements.push(new Paragraph({
                  children: runs,
                  numbering: { reference: 'default-numbering', level: 0 },
                  spacing: { before: 0, after: 60, line: 276 },
                  alignment: AlignmentType.LEFT,
                  indent: { left: 720 }
                }));
              }
            }
            
            j += 5;
          } else {
            j++;
          }
        }
        
        i = j + 1;
        continue;
      }

      if (token.type === 'fence' || token.type === 'code_block') {
        elements.push(new Paragraph({
          children: [new TextRun({
            text: token.content.trim(),
            font: 'Courier New',
            size: 18
          })],
          shading: { fill: 'F5F5F5', color: 'auto' },
          spacing: { before: 120, after: 120 },
          indent: { left: 360, right: 360 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
          }
        }));
        i++;
        continue;
      }

      if (token.type === 'hr') {
        elements.push(new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
          },
          spacing: { before: 120, after: 120 }
        }));
        i++;
        continue;
      }

      i++;
    }

    console.log(`[DOCX] Se generaron ${elements.length} elementos desde tokens`);
    console.log(`[DOCX] Imagenes insertadas: ${imageIndex - startImageIndex}`);
    
    return { elements, imagesUsed: imageIndex };
  }

  processTableTokens(tokens, startIndex) {
    console.log('[DOCX] Procesando tokens de tabla desde index:', startIndex);
    
    let i = startIndex + 1;
    const rows = [];
    let isHeader = false;

    while (i < tokens.length && tokens[i].type !== 'table_close') {
      if (tokens[i].type === 'thead_open') {
        isHeader = true;
        i++;
        continue;
      }

      if (tokens[i].type === 'thead_close') {
        isHeader = false;
        i++;
        continue;
      }

      if (tokens[i].type === 'tbody_open') {
        isHeader = false;
        i++;
        continue;
      }

      if (tokens[i].type === 'tbody_close') {
        i++;
        continue;
      }

      if (tokens[i].type === 'tr_open') {
        const cells = [];
        i++;

        while (i < tokens.length && tokens[i].type !== 'tr_close') {
          if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
            const cellType = tokens[i].type;
            i++;
            
            if (tokens[i] && tokens[i].type === 'inline') {
              const cellContent = tokens[i].content || '';
              cells.push({ 
                content: cellContent, 
                isHeader: cellType === 'th_open' 
              });
            }
            
            i++;
            if (tokens[i] && (tokens[i].type === 'th_close' || tokens[i].type === 'td_close')) {
              i++;
            }
          } else {
            i++;
          }
        }

        if (cells.length > 0) {
          rows.push(cells);
        }

        i++;
        continue;
      }

      i++;
    }

    console.log(`[DOCX] Total de filas procesadas: ${rows.length}`);

    if (rows.length === 0) {
      return { table: null, nextIndex: i + 1 };
    }

    const numColumns = Math.max(...rows.map(r => r.length));
    const columnWidth = 100 / numColumns;

    const tableRows = rows.map((cells, rowIndex) => {
      const isHeaderRow = cells.length > 0 && cells[0].isHeader;
      
      return new TableRow({
        children: cells.map(cell => {
          const runs = this.parseInlineTokens(
            this.md.parseInline(cell.content, {})[0]?.children || []
          );
          
          return new TableCell({
            children: [new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun({ text: cell.content })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 }
            })],
            width: { size: columnWidth, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { 
              top: convertInchesToTwip(0.05), 
              bottom: convertInchesToTwip(0.05), 
              left: convertInchesToTwip(0.08), 
              right: convertInchesToTwip(0.08) 
            },
            shading: cell.isHeader ? { 
              fill: 'D9D9D9', 
              color: 'auto' 
            } : { 
              fill: 'FFFFFF', 
              color: 'auto' 
            }
          });
        }),
        height: { 
          value: isHeaderRow ? convertInchesToTwip(0.35) : convertInchesToTwip(0.3), 
          rule: 'atLeast' 
        }
      });
    });

    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: '999999' }
      },
      margins: {
        top: convertInchesToTwip(0.05),
        bottom: convertInchesToTwip(0.05),
        left: convertInchesToTwip(0.05),
        right: convertInchesToTwip(0.05)
      }
    });

    console.log('[DOCX] Tabla Word creada exitosamente');
    return { table, nextIndex: i + 1 };
  }

  parseInlineTokens(children) {
    const runs = [];
    
    if (!children || children.length === 0) {
      return [];
    }

    let i = 0;
    while (i < children.length) {
      const child = children[i];
      
      if (child.type === 'text') {
        runs.push(new TextRun({ 
          text: child.content, 
          size: 22,
          font: 'Calibri'
        }));
        i++;
      } else if (child.type === 'strong_open') {
        i++;
        if (i < children.length && children[i].type === 'text') {
          runs.push(new TextRun({ 
            text: children[i].content, 
            bold: true, 
            size: 22,
            font: 'Calibri'
          }));
          i++;
        }
        if (i < children.length && children[i].type === 'strong_close') {
          i++;
        }
      } else if (child.type === 'em_open') {
        i++;
        if (i < children.length && children[i].type === 'text') {
          runs.push(new TextRun({ 
            text: children[i].content, 
            italics: true, 
            size: 22,
            font: 'Calibri'
          }));
          i++;
        }
        if (i < children.length && children[i].type === 'em_close') {
          i++;
        }
      } else if (child.type === 'code_inline') {
        runs.push(new TextRun({
          text: child.content,
          font: 'Courier New',
          size: 20,
          shading: { fill: 'F0F0F0', color: 'auto' }
        }));
        i++;
      } else if (child.type === 'link_open') {
        i++;
        if (i < children.length && children[i].type === 'text') {
          runs.push(new TextRun({ 
            text: children[i].content, 
            size: 22,
            font: 'Calibri',
            color: '0563C1',
            underline: {}
          }));
          i++;
        }
        if (i < children.length && children[i].type === 'link_close') {
          i++;
        }
      } else if (child.type === 'image') {
        i++;
      } else {
        i++;
      }
    }

    return runs;
  }

  async generateCompleteDocument({ templateId, content, metadata, images = [] }) {
    console.log('[DOCX] Generando documento programaticamente...');
    console.log(`[DOCX] Total de imagenes para incluir: ${images.length}`);
    
    const { processedContent, documentStructure } = this.processMarkdownContent(
      typeof content === 'string' ? content : JSON.stringify(content)
    );
    
    const sections = [];
    let globalImageIndex = 0;

    sections.push(...this.createProfessionalCoverPage(processedContent, metadata));
    sections.push(new Paragraph({ children: [new PageBreak()] }));

    if (documentStructure.length > 0) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));
    }

    const mainContent = this.createMainContent(
      processedContent, 
      templateId, 
      images,
      globalImageIndex
    );
    sections.push(...mainContent.sections);
    globalImageIndex = mainContent.imageIndex;

    if (globalImageIndex < images.length) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));
      sections.push(new Paragraph({
        text: 'ANEXO: FIGURAS COMPLEMENTARIAS',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 480 }
      }));

      let figureNumber = globalImageIndex + 1;
      while (globalImageIndex < images.length) {
        const img = images[globalImageIndex];
        sections.push(this.createImageParagraph(img));
        sections.push(this.createImageCaption(
          img.caption || `Figura complementaria ${figureNumber}`,
          figureNumber
        ));
        globalImageIndex++;
        figureNumber++;
      }
    }

    const doc = new Document({
      creator: 'ITE Report Generator',
      title: processedContent.title || metadata.topic || 'Reporte',
      description: `Reporte generado con plantilla ${templateId}`,
      sections: [{
        properties: {
          page: {
            margin: { 
              top: convertInchesToTwip(1), 
              bottom: convertInchesToTwip(1), 
              left: convertInchesToTwip(1), 
              right: convertInchesToTwip(1) 
            }
          }
        },
        children: sections
      }]
    });

    console.log('[DOCX] Documento generado con', sections.length, 'elementos');
    console.log('[DOCX] Total de imagenes incluidas:', globalImageIndex);
    
    return await Packer.toBuffer(doc);
  }

  createProfessionalCoverPage(content, metadata) {
    const sections = [];

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (metadata.school || 'TECNOLOGICO NACIONAL DE MEXICO').toUpperCase(),
            bold: true,
            size: 28,
            color: '1a1a1a',
            font: 'Arial'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: convertInchesToTwip(1.5), after: 200 }
      })
    );

    if (metadata.faculty) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.faculty.toUpperCase(),
              size: 24,
              color: '4a4a4a',
              font: 'Arial'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );
    }

    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '='.repeat(60), color: '2E5090', font: 'Arial' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 800 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (content.title || metadata.topic || 'REPORTE ACADEMICO').toUpperCase(),
            bold: true,
            size: 36,
            color: '2E5090',
            font: 'Arial'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 800 }
      })
    );

    sections.push(
      new Paragraph({
        children: [new TextRun({ text: '='.repeat(60), color: '2E5090', font: 'Arial' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: convertInchesToTwip(1) }
      })
    );

    const studentInfo = [
      metadata.student && `Elaborado por: ${metadata.student}`,
      metadata.studentId && `Numero de Control: ${metadata.studentId}`,
      metadata.subject && `Materia: ${metadata.subject}`,
      metadata.group && `Grupo: ${metadata.group}`,
      metadata.professor && `Profesor: ${metadata.professor}`
    ].filter(Boolean);

    studentInfo.forEach(info => {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: info, size: 22, color: '333333', font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 }
        })
      );
    });

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date().toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            size: 20,
            italics: true,
            color: '666666',
            font: 'Calibri'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: convertInchesToTwip(0.8) }
      })
    );

    return sections;
  }

  createMainContent(content, templateId, images = [], startImageIndex = 0) {
    const sections = [];
    let imageIndex = startImageIndex;
    let figureNumber = 1;

    const contentSections = [
      { title: 'RESUMEN', tokens: content.abstract, show: !!content.abstract },
      { title: 'INTRODUCCION', tokens: content.introduction, show: !!content.introduction },
      { title: 'METODOLOGIA', tokens: content.methodology, show: !!content.methodology },
      { title: 'RESULTADOS', tokens: content.results, show: !!content.results },
      { title: 'DISCUSION', tokens: content.discussion, show: !!content.discussion },
      { title: 'CONCLUSIONES', tokens: content.conclusions, show: !!content.conclusions }
    ];

    const sectionsWithContent = contentSections.filter(s => s.show);
    const imagesPerSection = images.length > 0 ? Math.floor(images.length / Math.max(sectionsWithContent.length, 1)) : 0;
    
    if (images.length > 0) {
      console.log(`[DOCX] Distribuyendo ${images.length} imagenes en ${sectionsWithContent.length} secciones`);
      console.log(`[DOCX] Aproximadamente ${imagesPerSection} imagenes por seccion`);
    }

    contentSections.forEach((section, index) => {
      if (!section.show || !section.tokens) return;

      if (index > 0) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
      }

      sections.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 240 }
        })
      );

      const result = this.tokensToDocxElements(section.tokens, images, imageIndex);
      sections.push(...result.elements);
      imageIndex = result.imagesUsed;

      const imagesToInsert = Math.min(imagesPerSection, images.length - imageIndex);
      
      if (imagesToInsert > 0) {
        console.log(`[DOCX] Insertando ${imagesToInsert} imagenes adicionales en seccion ${section.title}`);
        
        for (let i = 0; i < imagesToInsert; i++) {
          if (imageIndex < images.length) {
            const img = images[imageIndex];
            sections.push(this.createImageParagraph(img));
            sections.push(this.createImageCaption(
              img.caption || `Figura ${figureNumber}: Imagen ilustrativa`,
              figureNumber
            ));
            imageIndex++;
            figureNumber++;
          }
        }
      }
    });

    if (content.references && content.references.length > 0) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));
      sections.push(...this.createReferencesSection(content.references));
    }

    return { sections, imageIndex };
  }

  createReferencesSection(references) {
    const sections = [];

    sections.push(new Paragraph({
      text: 'REFERENCIAS BIBLIOGRAFICAS',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 }
    }));

    const refsArray = Array.isArray(references) ? references : [references];

    refsArray.forEach((ref, index) => {
      let refText = typeof ref === 'object' ? (ref.text || ref.toString()) : ref.toString();
      
      refText = refText
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^\[[\d]+\]\s*\.?\s*/, '')
        .trim();
      
      if (!refText) return;
      
      sections.push(new Paragraph({
        children: [
          new TextRun({ 
            text: `[${index + 1}] `, 
            bold: true, 
            size: 20,
            font: 'Calibri'
          }),
          new TextRun({ 
            text: refText, 
            size: 20,
            font: 'Calibri'
          })
        ],
        spacing: { after: 120, line: 276 },
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 360, hanging: 360 }
      }));
    });

    return sections;
  }

  getCurrentSemester() {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return month >= 8 ? `Agosto-Diciembre ${year}` : `Enero-Junio ${year}`;
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('[DOCX] Error creando directorio:', error);
    }
  }

  async saveDocument(buffer, filename) {
    try {
      await this.ensureOutputDir();
      const filepath = path.join(this.outputDir, filename);
      await fs.writeFile(filepath, buffer);
      console.log(`[DOCX] Documento guardado en: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('[DOCX] Error guardando documento:', error);
      throw error;
    }
  }
}

module.exports = new ExportDOCXService();