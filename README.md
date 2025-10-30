# Estructura del Servidor Node.js - Gemini API Project
### Con Autenticación de Usuarios, MongoDB y Swagger Automático

## Estructura de Carpetas

```
gemini-api-server/
│
├── src/
│   │
│   ├── config/
│   │   ├── index.js                    # Exporta toda la configuración centralizada
│   │   ├── database.js                 # Configuración conexión MongoDB
│   │   ├── gemini.config.js            # Configuración API Gemini (modelo, temperature, etc)
│   │   ├── multer.config.js            # Configuración subida de archivos
│   │   ├── cors.config.js              # Configuración CORS
│   │   ├── jwt.config.js               # Configuración JWT (secret, expiration)
│   │   ├── swagger.config.js           # Configuración Swagger UI y OpenAPI
│   │   └── constants.js                # Constantes globales (límites, tipos MIME, etc)
│   │
│   ├── decorators/
│   │   └── swagger.decorator.js        # Decoradores para metadata de Swagger
│   │
│   ├── controllers/
│   │   ├── auth/
│   │   │   ├── register.controller.js  # Registro de usuarios
│   │   │   ├── login.controller.js     # Login de usuarios
│   │   │   ├── logout.controller.js    # Logout y limpieza de sesión
│   │   │   └── profile.controller.js   # Obtener/actualizar perfil
│   │   │
│   │   ├── gemini/
│   │   │   ├── text.controller.js      # Consultas de texto simples
│   │   │   ├── image.controller.js     # Análisis de imágenes
│   │   │   ├── voice.controller.js     # Transcripción de voz
│   │   │   ├── multimodal.controller.js # Consultas combinadas
│   │   │   └── pdf.controller.js       # Análisis de documentos PDF
│   │   │
│   │   ├── conversation.controller.js  # CRUD conversaciones del usuario
│   │   ├── export.controller.js        # Exportar conversaciones (PDF/TXT)
│   │   └── docs.controller.js          # Controlador para Swagger UI
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── auth.service.js         # Lógica de autenticación
│   │   │   ├── password.service.js     # Hasheo y comparación de passwords
│   │   │   ├── token.service.js        # Generación y validación de JWT
│   │   │   └── session.service.js      # Gestión de sesiones activas
│   │   │
│   │   ├── gemini/
│   │   │   ├── geminiClient.service.js # Cliente principal de Gemini API
│   │   │   ├── textGeneration.service.js # Generación de texto
│   │   │   ├── visionAnalysis.service.js # Análisis visual
│   │   │   └── streamResponse.service.js # Respuestas en streaming
│   │   │
│   │   ├── processing/
│   │   │   ├── imageProcessor.service.js # Redimensionar, comprimir imágenes
│   │   │   ├── audioProcessor.service.js # Procesar audio para transcripción
│   │   │   ├── pdfParser.service.js      # Extraer texto de PDFs
│   │   │   └── textFormatter.service.js  # Formateo de respuestas
│   │   │
│   │   ├── database/
│   │   │   ├── user.service.js         # CRUD usuarios
│   │   │   ├── conversation.service.js # CRUD conversaciones
│   │   │   └── message.service.js      # CRUD mensajes
│   │   │
│   │   ├── swagger/
│   │   │   ├── swaggerGenerator.service.js  # Genera spec OpenAPI automáticamente
│   │   │   ├── routeScanner.service.js      # Escanea rutas de Express
│   │   │   ├── jsdocParser.service.js       # Parsea comentarios JSDoc
│   │   │   └── schemaBuilder.service.js     # Construye schemas OpenAPI
│   │   │
│   │   └── utils/
│   │       ├── tokenCounter.service.js   # Contador tokens y costos estimados
│   │       ├── exportPDF.service.js      # Generar PDFs de conversaciones
│   │       ├── exportTXT.service.js      # Generar TXT de conversaciones
│   │       └── fileStorage.service.js    # Limpieza archivos temporales
│   │
│   ├── middlewares/
│   │   ├── auth/
│   │   │   ├── authenticate.js         # Verificar JWT y autenticar usuario
│   │   │   ├── authorize.js            # Verificar permisos/roles
│   │   │   └── validateToken.js        # Validar formato del token
│   │   │
│   │   ├── errorHandler.js             # Manejador global de errores
│   │   ├── asyncHandler.js             # Wrapper para async/await
│   │   ├── validation.js               # Validaciones de entrada
│   │   ├── fileUpload.js               # Middleware Multer configurado
│   │   ├── rateLimiter.js              # Rate limiting por IP/Usuario
│   │   ├── requestLogger.js            # Log de todas las requests
│   │   └── sanitizer.js                # Sanitización de inputs
│   │
│   ├── routes/
│   │   ├── index.js                    # Router principal (agrega todas las rutas)
│   │   │
│   │   ├── auth/
│   │   │   └── auth.routes.js          # POST /api/auth/register, /login, /logout
│   │   │
│   │   ├── api/
│   │   │   ├── text.routes.js          # POST /api/gemini/text
│   │   │   ├── image.routes.js         # POST /api/gemini/image
│   │   │   ├── voice.routes.js         # POST /api/gemini/voice
│   │   │   ├── multimodal.routes.js    # POST /api/gemini/multimodal
│   │   │   ├── pdf.routes.js           # POST /api/gemini/pdf
│   │   │   ├── conversation.routes.js  # GET/POST/DELETE /api/conversations
│   │   │   ├── export.routes.js        # GET /api/export/:conversationId
│   │   │   ├── user.routes.js          # GET/PUT /api/user/profile
│   │   │   └── docs.routes.js          # GET /api/docs (Swagger UI)
│   │   │
│   │   └── health.routes.js            # GET /health, /status
│   │
│   ├── utils/
│   │   ├── validators/
│   │   │   ├── authValidator.js        # Validar email, password, username
│   │   │   ├── fileValidator.js        # Validar tipo, tamaño de archivos
│   │   │   ├── textValidator.js        # Validar longitud, caracteres
│   │   │   └── imageValidator.js       # Validar formato, dimensiones
│   │   │
│   │   ├── helpers/
│   │   │   ├── fileHelper.js           # Crear/eliminar archivos temporales
│   │   │   ├── responseFormatter.js    # Formatear respuestas consistentes
│   │   │   ├── errorMessages.js        # Mensajes de error centralizados
│   │   │   └── dateHelper.js           # Formateo de fechas
│   │   │
│   │   └── logger.js                   # Winston logger configurado
│   │
│   ├── models/
│   │   ├── User.model.js               # Schema de Usuario (Mongoose)
│   │   ├── Conversation.model.js       # Schema de Conversación
│   │   ├── Message.model.js            # Schema de Mensaje individual
│   │   └── Session.model.js            # Schema de Sesión activa (opcional)
│   │
│   └── app.js                          # Configuración de Express (middlewares, routes)
│
├── uploads/                            # Archivos temporales subidos (gitignored)
│   ├── images/
│   ├── audio/
│   └── pdfs/
│
├── logs/                               # Logs de la aplicación (gitignored)
│   ├── error.log
│   ├── combined.log
│   └── access.log
│
├── docs/
│   ├── API_DOCUMENTATION.md            # Documentación completa de endpoints
│   ├── SWAGGER_GUIDE.md                # Guía de uso de decoradores Swagger
│   ├── ARCHITECTURE.md                 # Explicación de arquitectura
│   └── SETUP.md                        # Guía de instalación y configuración
│
├── swagger.json                        # Spec OpenAPI generado automáticamente
├── .env.example                        # Ejemplo de variables de entorno
├── .env                                # Variables de entorno REAL (gitignored)
├── .gitignore                          # Archivos ignorados por Git
├── .eslintrc.json                      # Configuración ESLint
├── .prettierrc                         # Configuración Prettier
├── nodemon.json                        # Configuración Nodemon
├── package.json                        # Dependencias y scripts
├── package-lock.json
├── server.js                           # Entry point - Inicia servidor
└── README.md                           # Documentación principal del proyecto
```

---

## Esquemas de MongoDB

### User Model
```javascript
{
  username: String,
  email: String (unique),
  password: String (hasheado),
  avatar: String (opcional),
  role: String (default: 'user'),
  preferences: {
    theme: String,
    language: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Model
```javascript
{
  userId: ObjectId (ref: 'User'),
  title: String,
  tags: [String],
  messages: [ObjectId] (ref: 'Message'),
  tokenUsage: {
    total: Number,
    estimatedCost: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  conversationId: ObjectId (ref: 'Conversation'),
  role: String ('user' | 'assistant'),
  content: String,
  type: String ('text' | 'image' | 'voice' | 'multimodal'),
  attachments: [{
    type: String,
    url: String,
    name: String
  }],
  tokens: Number,
  createdAt: Date
}
```

### Session Model (Opcional)
```javascript
{
  userId: ObjectId (ref: 'User'),
  token: String,
  ipAddress: String,
  userAgent: String,
  expiresAt: Date,
  createdAt: Date
}
```

---

## Descripción de Carpetas Principales

### config/
Toda la configuración centralizada de la aplicación. Variables de entorno, configuración de APIs externas, constantes globales, y configuración de Swagger.

### decorators/
Decoradores y utilidades para agregar metadata a las rutas que será consumida por el generador de Swagger.

### controllers/
Capa de controladores - reciben requests HTTP, llaman a servicios, devuelven responses. Lógica de coordinación, no lógica de negocio.

### services/
Capa de lógica de negocio. Aquí va toda la lógica compleja:
- `auth/` - Todo lo relacionado con autenticación y autorización
- `gemini/` - Todo lo relacionado con la API de Gemini
- `processing/` - Procesamiento de archivos (imágenes, audio, PDFs)
- `database/` - Gestión de datos (conversaciones, sesiones)
- `swagger/` - Generación automática de documentación OpenAPI
- `utils/` - Servicios utilitarios (exportación, contadores)

### middlewares/
Funciones que interceptan requests antes de llegar a los controladores:
- Validación
- Autenticación y autorización
- Manejo de errores
- Rate limiting
- Logging
- Upload de archivos

### routes/
Definición de endpoints de la API. Cada archivo agrupa rutas relacionadas. Incluyen comentarios JSDoc para generación automática de Swagger.

### utils/
Funciones auxiliares y helpers reutilizables en toda la app:
- Validadores específicos
- Helpers de archivos
- Formateadores
- Logger

### models/
Definición de estructuras de datos con Mongoose para MongoDB.

---

## Dependencias

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.x.x",
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "winston": "^3.11.0",
    "pdf-parse": "^1.1.1",
    "sharp": "^0.33.1",
    "express-validator": "^7.0.1",
    "cookie-parser": "^1.4.6",
    "swagger-ui-express": "^5.0.0",
    "swagger-jsdoc": "^6.2.8",
    "yamljs": "^0.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

---

## Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gemini-api

# JWT
JWT_SECRET=tu_super_secreto_largo_y_seguro_aqui_cambiar_en_produccion
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Gemini API
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,image/gif
ALLOWED_AUDIO_TYPES=audio/wav,audio/mpeg,audio/webm
ALLOWED_PDF_TYPES=application/pdf

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Bcrypt
BCRYPT_ROUNDS=10

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=/api/docs
```

---

## Scripts NPM

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "swagger:generate": "node src/services/swagger/swaggerGenerator.service.js"
  }
}
```

---

## Instalación y Configuración

### Paso 1: Clonar o crear el proyecto

```bash
mkdir gemini-api-server
cd gemini-api-server
```

### Paso 2: Inicializar proyecto Node.js

```bash
npm init -y
```

### Paso 3: Instalar dependencias

```bash
# Dependencias de producción
npm install @google/generative-ai express mongoose bcryptjs jsonwebtoken cors dotenv multer express-rate-limit helmet compression winston pdf-parse sharp express-validator cookie-parser swagger-ui-express swagger-jsdoc yamljs

# Dependencias de desarrollo
npm install -D nodemon eslint prettier
```

### Paso 4: Crear estructura de carpetas

```bash
# En Linux/Mac
mkdir -p src/{config,decorators,controllers/{auth,gemini},services/{auth,gemini,processing,database,swagger,utils},middlewares/auth,routes/{auth,api},utils/{validators,helpers},models}
mkdir -p uploads/{images,audio,pdfs}
mkdir -p logs
mkdir -p docs

# En Windows (PowerShell)
New-Item -ItemType Directory -Force -Path src/config,src/decorators,src/controllers/auth,src/controllers/gemini,src/services/auth,src/services/gemini,src/services/processing,src/services/database,src/services/swagger,src/services/utils,src/middlewares/auth,src/routes/auth,src/routes/api,src/utils/validators,src/utils/helpers,src/models,uploads/images,uploads/audio,uploads/pdfs,logs,docs
```

### Paso 5: Crear archivo .gitignore

```bash
# .gitignore
node_modules/
.env
uploads/
logs/
*.log
.DS_Store
swagger.json
```

### Paso 6: Copiar .env.example a .env

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales reales.

### Paso 7: Configurar MongoDB

#### Opción A: MongoDB Local

```bash
# Instalar MongoDB localmente
# Linux (Ubuntu)
sudo apt-get install mongodb

# Mac
brew install mongodb-community

# Iniciar servicio
sudo systemctl start mongodb  # Linux
brew services start mongodb-community  # Mac
```

#### Opción B: MongoDB Atlas (Cloud)

1. Crear cuenta en https://www.mongodb.com/cloud/atlas
2. Crear cluster gratuito
3. Crear usuario de base de datos
4. Obtener connection string
5. Actualizar `MONGODB_URI` en `.env`:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/gemini-api?retryWrites=true&w=majority
```

### Paso 8: Obtener API Key de Gemini

1. Ir a https://makersuite.google.com/app/apikey
2. Crear API Key
3. Copiar y pegar en `.env`:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

### Paso 9: Configurar ESLint (Opcional)

```bash
npm init @eslint/config
```

Crear archivo `.eslintrc.json`:

```json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": "warn"
  }
}
```

### Paso 10: Configurar Prettier (Opcional)

Crear archivo `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Paso 11: Configurar Nodemon

Crear archivo `nodemon.json`:

```json
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": ["src/**/*.test.js"],
  "exec": "node server.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Paso 12: Crear archivo server.js

```bash
touch server.js
```

### Paso 13: Crear archivo app.js

```bash
touch src/app.js
```

### Paso 14: Iniciar el servidor

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

### Paso 15: Verificar instalación

El servidor debería iniciar en `http://localhost:5000`

Endpoints disponibles:
- `GET /health` - Verificar estado del servidor
- `GET /api/docs` - Documentación Swagger UI
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Login de usuarios

---

## Flujo de Request Típico

### Con Autenticación:

```
Request → server.js → app.js → routes → authenticate middleware → controllers → services → response
```

### Rutas Públicas:

```
POST /api/auth/register
POST /api/auth/login
GET /health
GET /api/docs
```

### Rutas Protegidas:

```
POST /api/gemini/text
POST /api/gemini/image
POST /api/gemini/voice
POST /api/gemini/multimodal
POST /api/gemini/pdf
GET /api/conversations
POST /api/conversations
DELETE /api/conversations/:id
GET /api/user/profile
PUT /api/user/profile
GET /api/export/:conversationId
POST /api/auth/logout
```

---

## Sistema de Swagger Automático

### Cómo funciona

1. Las rutas incluyen comentarios JSDoc con anotaciones `@swagger`
2. El servicio `swaggerGenerator.service.js` escanea todos los archivos en `src/routes/`
3. Genera automáticamente la especificación OpenAPI 3.0
4. Swagger UI se monta en `/api/docs`
5. La especificación JSON se guarda en `swagger.json`

### Acceder a la documentación

Una vez iniciado el servidor:

```
http://localhost:5000/api/docs
```

### Regenerar documentación

```bash
npm run swagger:generate
```

---

## Principios de Arquitectura

### Separación de Responsabilidades
- Controllers: Coordinan flujo (delgados)
- Services: Contienen lógica de negocio (gruesos)
- Routes: Solo definen endpoints
- Middlewares: Tareas transversales

### Modularidad
Cada módulo es independiente y reutilizable.

### Escalabilidad
Fácil agregar nuevas features sin modificar código existente.

### Mantenibilidad
Código organizado, fácil de entender y modificar.

### Testeable
Servicios y controladores fáciles de testear unitariamente.

---

## Seguridad

- JWT para autenticación stateless
- Passwords hasheados con bcrypt (10+ rounds)
- API Key en variables de entorno
- Helmet para headers seguros
- Rate limiting por usuario autenticado
- Validación y sanitización de inputs
- CORS configurado correctamente
- Manejo seguro de archivos temporales
- MongoDB con validaciones de schema
- Tokens con expiración
- Logout con invalidación de token

---

## Próximos Pasos

1. Implementar modelos de Mongoose
2. Configurar conexión a MongoDB
3. Implementar servicios de autenticación
4. Crear middlewares de autenticación
5. Implementar servicios de Gemini
6. Crear controladores
7. Definir rutas con JSDoc
8. Implementar generador de Swagger
9. Testing
10. Documentación adicional

---

## Notas Importantes

### Seguridad:
- NO subir API Key ni JWT_SECRET al repositorio
- Usar JWT_SECRET largo y aleatorio en producción
- Implementar refresh tokens para mayor seguridad
- Considerar rate limiting agresivo para endpoints de auth
- Hashear passwords con bcrypt rounds >= 10

### Base de Datos:
- Crear indexes en MongoDB: email (unique), userId en conversaciones
- Validación a nivel de schema con Mongoose
- Limpieza de archivos temporales periódicamente
- Backup regular de MongoDB

### Performance:
- Implementar logs para debugging
- Validar todas las entradas del usuario
- Documentar cada endpoint con JSDoc
- Usar async/await con try-catch
- Implementar paginación en listado de conversaciones

### Swagger:
- Mantener comentarios JSDoc actualizados
- Regenerar swagger.json después de cambios en rutas
- Incluir ejemplos en la documentación
- Documentar todos los códigos de error posibles
- Usar schemas reutilizables en components/schemas