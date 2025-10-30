# Gemini API Server

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8.x-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Servidor API RESTful con integración de Google Gemini AI, autenticación JWT, gestión de usuarios y documentación automática con Swagger.

## Descripción del Proyecto

Este proyecto es un servidor backend completo desarrollado con Node.js y Express que proporciona una interfaz segura para interactuar con la API de Google Gemini AI. Incluye autenticación de usuarios, gestión de conversaciones, procesamiento de archivos multimedia y documentación interactiva.

### Características Principales

- Integración completa con Google Gemini AI (texto, imágenes, voz, PDF, multimodal)
- Sistema de autenticación JWT con cookies seguras
- Gestión de usuarios y perfiles
- Historial de conversaciones persistente en MongoDB
- Procesamiento de archivos (imágenes, audio, PDFs)
- Rate limiting y seguridad avanzada
- Documentación API automática con Swagger
- Logs estructurados con Winston
- Exportación de conversaciones (PDF/TXT)
- Arquitectura modular y escalable

## Tecnologías Utilizadas

### Backend
- **Node.js** (v18+) - Entorno de ejecución
- **Express.js** (v5.x) - Framework web
- **MongoDB** (v8.x) - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB

### Autenticación y Seguridad
- **JWT** (jsonwebtoken) - Tokens de autenticación
- **bcryptjs** - Encriptación de contraseñas
- **Helmet** - Headers de seguridad HTTP
- **express-rate-limit** - Limitación de peticiones
- **CORS** - Control de acceso entre dominios

### Procesamiento de Archivos
- **Multer** - Upload de archivos
- **Sharp** - Procesamiento de imágenes
- **pdf-parse** - Extracción de texto de PDFs

### IA y API Externa
- **@google/generative-ai** - Cliente de Gemini API

### Documentación y Logs
- **Swagger UI Express** - Interfaz de documentación
- **swagger-jsdoc** - Generación de specs OpenAPI
- **Winston** - Sistema de logging

### Desarrollo
- **nodemon** - Hot reload en desarrollo
- **dotenv** - Gestión de variables de entorno
- **ESLint** - Linter de código
- **Prettier** - Formateador de código

## Estructura del Proyecto

```
gemini-api-server/
├── src/
│   ├── config/              # Configuraciones centralizadas
│   │   ├── database.js      # Conexión MongoDB
│   │   ├── gemini.config.js # Configuración Gemini API
│   │   ├── cors.config.js   # Configuración CORS
│   │   ├── jwt.config.js    # Configuración JWT
│   │   └── swagger.config.js # Configuración Swagger
│   │
│   ├── controllers/         # Controladores de rutas
│   │   ├── auth/           # Autenticación
│   │   └── gemini/         # Endpoints Gemini
│   │
│   ├── services/           # Lógica de negocio
│   │   ├── auth/           # Servicios de autenticación
│   │   ├── gemini/         # Servicios Gemini AI
│   │   ├── processing/     # Procesamiento de archivos
│   │   ├── database/       # Gestión de datos
│   │   └── utils/          # Utilidades
│   │
│   ├── middlewares/        # Middlewares personalizados
│   │   ├── auth/           # Autenticación y autorización
│   │   ├── errorHandler.js # Manejo global de errores
│   │   ├── rateLimiter.js  # Rate limiting
│   │   └── validation.js   # Validaciones
│   │
│   ├── routes/             # Definición de rutas
│   │   ├── auth/           # Rutas de autenticación
│   │   └── api/            # Rutas de API
│   │
│   ├── models/             # Modelos de Mongoose
│   │   ├── User.model.js
│   │   ├── Conversation.model.js
│   │   └── Message.model.js
│   │
│   ├── utils/              # Funciones auxiliares
│   │   ├── validators/     # Validadores
│   │   ├── helpers/        # Helpers
│   │   └── logger.js       # Winston logger
│   │
│   └── app.js              # Configuración Express
│
├── uploads/                # Archivos temporales
├── logs/                   # Logs de aplicación
├── docs/                   # Documentación técnica
├── .env.example            # Ejemplo de variables
├── server.js               # Entry point
├── package.json
└── README.md
```

## Instalación

### Requisitos Previos

- Node.js v18 o superior
- MongoDB v5 o superior (local o Atlas)
- API Key de Google Gemini ([obtener aquí](https://makersuite.google.com/app/apikey))

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/avalontm/gemini-api-server.git
cd gemini-api-server
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

Copia el archivo de ejemplo y edita las variables:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Servidor
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gemini-api

# JWT
JWT_SECRET=tu_secreto_super_largo_y_aleatorio_minimo_32_caracteres
JWT_EXPIRE=7d

# Gemini API
GEMINI_API_KEY=tu_api_key_de_gemini
GEMINI_MODEL=gemini-1.5-flash

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=/api/docs
```

### Paso 4: Iniciar MongoDB

**Opción A: MongoDB Local**

```bash
# Linux
sudo systemctl start mongod

# macOS
brew services start mongodb-community

# Windows
net start MongoDB
```

**Opción B: MongoDB Atlas**

1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crear cluster gratuito
3. Obtener connection string
4. Actualizar `MONGODB_URI` en `.env`

### Paso 5: Iniciar el Servidor

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm start
```

El servidor estará disponible en: `http://localhost:5000`

## Funcionalidades Implementadas

### 1. Autenticación y Usuarios

- **Registro de usuarios** con validación de email único
- **Login** con generación de JWT
- **Logout** con invalidación de token
- **Perfil de usuario** (lectura y actualización)
- **Cambio de contraseña** seguro
- **Encriptación bcrypt** (10 rounds)
- **Tokens JWT** con expiración configurable

### 2. Integración Gemini AI

#### Consultas de Texto
- Generación de texto con IA
- Soporte para conversaciones contextuales
- Ajuste de parámetros (temperature, maxTokens)

#### Análisis de Imágenes
- Upload de imágenes (JPEG, PNG, WebP, GIF)
- Análisis visual con Gemini Vision
- Redimensionamiento automático con Sharp
- Validación de tipos MIME

#### Transcripción de Voz
- Soporte de formatos: WAV, MP3, WebM
- Conversión de audio a texto
- Procesamiento automático

#### Análisis de PDFs
- Extracción de texto de documentos
- Análisis de contenido con IA
- Validación de archivos

#### Modo Multimodal
- Combinación de texto + imágenes
- Consultas complejas
- Respuestas contextuales

### 3. Gestión de Conversaciones

- **CRUD completo** de conversaciones
- **Historial persistente** en MongoDB
- **Etiquetado** de conversaciones
- **Contador de tokens** y costos estimados
- **Paginación** de resultados
- **Búsqueda** por título o tags

### 4. Exportación de Datos

- **Exportar a PDF** con formato profesional
- **Exportar a TXT** simple
- **Descarga directa** de archivos
- **Limpieza automática** de exportaciones antiguas

### 5. Seguridad

- **Rate Limiting** por endpoint y usuario
- **Helmet** para headers seguros
- **CORS** configurado correctamente
- **Validación** de inputs con express-validator
- **Sanitización** de datos
- **Manejo seguro** de archivos temporales

### 6. Documentación API

- **Swagger UI** interactivo en `/api/docs`
- **Generación automática** desde JSDoc
- **Testing en vivo** de endpoints
- **Autenticación Bearer** integrada
- **Ejemplos** de requests y responses

### 7. Monitoreo y Logs

- **Winston** para logging estructurado
- **Logs por nivel** (error, warn, info)
- **Rotación automática** de archivos
- **Health checks** (`/health`, `/status`)
- **Métricas** de memoria y CPU

## Endpoints Principales

### Autenticación

```
POST   /api/auth/register        - Registrar usuario
POST   /api/auth/login           - Iniciar sesión
POST   /api/auth/logout          - Cerrar sesión
GET    /api/auth/profile         - Obtener perfil
PUT    /api/auth/profile         - Actualizar perfil
POST   /api/auth/change-password - Cambiar contraseña
GET    /api/auth/me              - Usuario actual
```

### Gemini AI

```
POST   /api/gemini/text         - Consulta de texto
POST   /api/gemini/image        - Análisis de imagen
POST   /api/gemini/voice        - Transcripción de voz
POST   /api/gemini/pdf          - Análisis de PDF
POST   /api/gemini/multimodal   - Consulta multimodal
```

### Conversaciones

```
GET    /api/conversations       - Listar conversaciones
POST   /api/conversations       - Crear conversación
GET    /api/conversations/:id   - Obtener conversación
PUT    /api/conversations/:id   - Actualizar conversación
DELETE /api/conversations/:id   - Eliminar conversación
```

### Exportación

```
GET    /api/export/:id/pdf      - Exportar a PDF
GET    /api/export/:id/txt      - Exportar a TXT
```

### Monitoreo

```
GET    /health                  - Estado del servidor
GET    /status                  - Métricas detalladas
GET    /api/docs                - Documentación Swagger
```

## Uso de la API

### 1. Registrar Usuario

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 2. Iniciar Sesión

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 3. Consultar a Gemini

```bash
curl -X POST http://localhost:5000/api/gemini/text \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explica qué es la inteligencia artificial"
  }'
```

### 4. Analizar Imagen

```bash
curl -X POST http://localhost:5000/api/gemini/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@./foto.jpg" \
  -F "prompt=Describe esta imagen en detalle"
```

## Scripts Disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Producción
npm start

# Linting
npm run lint
npm run lint:fix

# Formateo
npm run format

# Generar documentación Swagger
npm run swagger:generate
```

## Arquitectura y Decisiones de Diseño

### Patrón de Arquitectura

El proyecto sigue una **arquitectura en capas**:

1. **Capa de Rutas**: Define endpoints y aplica middlewares
2. **Capa de Controladores**: Coordina flujo de datos
3. **Capa de Servicios**: Contiene lógica de negocio
4. **Capa de Modelos**: Define esquemas de datos
5. **Capa de Middlewares**: Funcionalidades transversales

### Principios Aplicados

- **Separación de responsabilidades**: Cada módulo tiene una función específica
- **DRY (Don't Repeat Yourself)**: Código reutilizable
- **SOLID**: Principios de diseño orientado a objetos
- **Modularidad**: Fácil agregar nuevas features
- **Testabilidad**: Servicios fáciles de testear

### Seguridad

- Contraseñas hasheadas con bcrypt (10+ rounds)
- Tokens JWT con expiración
- Rate limiting por endpoint
- Validación y sanitización de inputs
- Headers seguros con Helmet
- CORS configurado correctamente

### Performance

- Compresión de respuestas con gzip
- Pool de conexiones MongoDB
- Limpieza automática de archivos temporales
- Timeouts configurados
- Manejo eficiente de streams

## Testing

Para probar los endpoints, puedes usar:

1. **Swagger UI**: `http://localhost:5000/api/docs`
2. **Postman**: Importar collection desde Swagger
3. **cURL**: Ejemplos en la documentación
4. **Thunder Client**: Extensión de VS Code

## Deployment

### Variables de Entorno en Producción

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=cambiar_a_secreto_seguro
GEMINI_API_KEY=tu_api_key
SHOW_ERROR_STACK=false
```

### Plataformas Recomendadas

- **Railway**: Deploy automático desde GitHub
- **Render**: Free tier con MongoDB
- **Heroku**: Fácil configuración
- **AWS EC2**: Control completo
- **DigitalOcean**: VPS económico

### Checklist Pre-Deploy

- [ ] Cambiar JWT_SECRET a valor aleatorio largo
- [ ] Usar MongoDB Atlas o base de datos remota
- [ ] Configurar CORS con dominios específicos
- [ ] Establecer NODE_ENV=production
- [ ] Deshabilitar logs detallados
- [ ] Configurar rate limits estrictos
- [ ] Backup de base de datos
- [ ] Monitoreo configurado

## Troubleshooting

### Error: "connectDB is not a function"

**Solución**: Verificar que en `server.js` se use destructuring:
```javascript
const { connectDB } = require('./src/config/database');
```

### Error: "Missing parameter name at index 1: *"

**Solución**: Express 5 no soporta `app.use('*', ...)`. Usar `app.use((req, res) => ...)` sin asterisco.

### Error: "option keepAlive is not supported"

**Solución**: Mongoose 8 no soporta `keepAlive`. Actualizar `database.js` removiendo esas opciones.

### MongoDB Connection Failed

**Soluciones**:
1. Verificar que MongoDB esté corriendo: `sudo systemctl status mongod`
2. Revisar MONGODB_URI en `.env`
3. Para Atlas, verificar whitelist de IPs

## Contribuir

1. Fork el proyecto
2. Crea tu rama: `git checkout -b feature/AmazingFeature`
3. Commit cambios: `git commit -m 'Add AmazingFeature'`
4. Push a la rama: `git push origin feature/AmazingFeature`
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## Contacto

AvalonTM - [@avalontm](https://twitter.com/avalontm) - avalontm21@gmail.com

Link del Proyecto: [https://github.com/avalontm/gemini-api-server](https://github.com/avalontm/gemini-api-server)

## Agradecimientos

- [Google Gemini AI](https://ai.google.dev/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Node.js](https://nodejs.org/)
- [Swagger](https://swagger.io/)

---

Hecho con ❤️ por [AvalonTM](https://github.com/avalontm)