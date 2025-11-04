// test-markdown-parser.js
// Script de diagnóstico para verificar el parsing de markdown

const MarkdownIt = require('markdown-it');
const markdownItMultimdTable = require('markdown-it-multimd-table');

// Configurar markdown-it igual que en el servicio
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true
}).use(markdownItMultimdTable, {
  multiline: true,
  rowspan: true,
  headerless: true,
  multibody: true,
  aotolabel: true
});

// Markdown de prueba con tablas
const testMarkdown = `
# Título del Reporte

## Introducción

Este es un párrafo de introducción con **texto en negritas** y *texto en cursiva*.

## Resultados

A continuación se presentan los resultados en una tabla:

| Categoría | Valor | Porcentaje |
|-----------|-------|------------|
| Opción A  | 150   | 45%        |
| Opción B  | 200   | 60%        |
| Opción C  | 100   | 30%        |

### Análisis

- Punto 1: Descripción del análisis
- Punto 2: Más información
- Punto 3: Conclusión parcial

## Conclusiones

El estudio demuestra que \`variable_x\` tiene un impacto significativo.
`;

console.log('='.repeat(80));
console.log('DIAGNÓSTICO DE PARSING DE MARKDOWN');
console.log('='.repeat(80));
console.log('\n📄 MARKDOWN ORIGINAL:');
console.log('-'.repeat(80));
console.log(testMarkdown);
console.log('-'.repeat(80));

// Parsear markdown
const tokens = md.parse(testMarkdown, {});

console.log('\n🔍 TOKENS GENERADOS:');
console.log('-'.repeat(80));
console.log(`Total de tokens: ${tokens.length}\n`);

// Mostrar todos los tokens
tokens.forEach((token, index) => {
  console.log(`[${index}] ${token.type}`, token.tag ? `<${token.tag}>` : '');
  
  if (token.type === 'inline' && token.content) {
    console.log(`    Contenido: "${token.content.substring(0, 60)}${token.content.length > 60 ? '...' : ''}"`);
  }
  
  if (token.children && token.children.length > 0) {
    console.log(`    Children: ${token.children.length} tokens`);
    token.children.forEach((child, i) => {
      console.log(`      [${i}] ${child.type}: "${child.content?.substring(0, 40) || ''}"`);
    });
  }
});

console.log('\n');
console.log('='.repeat(80));
console.log('DETECCIÓN DE TABLAS');
console.log('='.repeat(80));

// Buscar tokens de tabla
const tableTokens = tokens.filter(t => t.type.includes('table'));
console.log(`\n📊 Tokens de tabla encontrados: ${tableTokens.length}`);

tableTokens.forEach((token, index) => {
  console.log(`\n[${index}] ${token.type}:`, JSON.stringify(token, null, 2));
});

// Verificar si hay table_open
const hasTableOpen = tokens.some(t => t.type === 'table_open');
console.log(`\n✅ ¿Se detectó table_open?: ${hasTableOpen}`);

if (!hasTableOpen) {
  console.log('\n⚠️  NO SE DETECTARON TABLAS');
  console.log('Posibles causas:');
  console.log('1. El plugin markdown-it-multimd-table no está instalado correctamente');
  console.log('2. El formato de la tabla en markdown es incorrecto');
  console.log('3. La configuración del parser es incorrecta');
  
  console.log('\nVerifica la instalación:');
  console.log('  npm list markdown-it markdown-it-multimd-table');
} else {
  console.log('\n✅ TABLAS DETECTADAS CORRECTAMENTE');
}

console.log('\n');
console.log('='.repeat(80));
console.log('PROCESAMIENTO DE TABLA (SIMULACIÓN)');
console.log('='.repeat(80));

let i = 0;
while (i < tokens.length) {
  if (tokens[i].type === 'table_open') {
    console.log('\n📋 Procesando tabla...');
    let j = i + 1;
    let rowCount = 0;
    
    while (j < tokens.length && tokens[j].type !== 'table_close') {
      if (tokens[j].type === 'tr_open') {
        rowCount++;
        console.log(`  Fila ${rowCount}:`);
        
        let k = j + 1;
        let cellCount = 0;
        while (k < tokens.length && tokens[k].type !== 'tr_close') {
          if (tokens[k].type === 'th_open' || tokens[k].type === 'td_open') {
            const cellType = tokens[k].type === 'th_open' ? 'Header' : 'Data';
            k++; // Saltar th_open/td_open
            
            if (tokens[k] && tokens[k].type === 'inline') {
              cellCount++;
              console.log(`    Celda ${cellCount} (${cellType}): "${tokens[k].content}"`);
            }
            
            k++; // Saltar inline
            k++; // Saltar th_close/td_close
          } else {
            k++;
          }
        }
      }
      j++;
    }
    
    console.log(`  Total de filas: ${rowCount}`);
    i = j;
  }
  i++;
}

console.log('\n');
console.log('='.repeat(80));
console.log('RENDERIZADO HTML (Para comparación)');
console.log('='.repeat(80));
console.log(md.render(testMarkdown));

console.log('\n');
console.log('='.repeat(80));
console.log('INSTRUCCIONES');
console.log('='.repeat(80));
console.log('\n1. Ejecuta este script:');
console.log('   node test-markdown-parser.js\n');
console.log('2. Verifica que se detecten las tablas correctamente');
console.log('3. Si NO se detectan tablas, reinstala el plugin:');
console.log('   npm uninstall markdown-it-multimd-table');
console.log('   npm install markdown-it-multimd-table\n');
console.log('4. Compara los tokens con los que genera tu servicio');
console.log('   (Agrega logs en exportDOCXService.markdownTokensToDocxElements)\n');
console.log('='.repeat(80));