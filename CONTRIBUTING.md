# Guía de Contribución
## Gemini API Server

Proyecto desarrollado por estudiantes del Tecnológico Nacional de México Campus Ensenada

---

## Tabla de Contenidos

- [Información Institucional](#información-institucional)
- [Equipo de Desarrollo](#equipo-de-desarrollo)
- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Convenciones de Commits](#convenciones-de-commits)
- [Pull Requests](#pull-requests)
- [Reportar Bugs](#reportar-bugs)
- [Solicitar Features](#solicitar-features)

---

## Información Institucional

### Tecnológico Nacional de México Campus Ensenada

**Institución**: Tecnológico Nacional de México  
**Campus**: Ensenada, Baja California  
**Carrera**: Ingeniería en Sistemas Computacionales  
**Materia**: Desarrollo de Aplicaciones Web  
**Semestre**: Agosto - Diciembre 2025  
**Profesor**: [Nombre del Profesor]

**Dirección**: Blvd. Tecnológico No. 150, Ex Ejido Chapultepec, 22785 Ensenada, B.C.  
**Sitio Web**: [https://ensenada.tecnm.mx](https://ensenada.tecnm.mx)

---

## Equipo de Desarrollo

Este proyecto está siendo desarrollado como parte del proyecto final de la materia de Desarrollo de Aplicaciones Web.

### 👨‍💻 Integrante 1 - [Nombre Completo]
**Rol**: Tech Lead & Backend Architecture  
**No. Control**: [Número de Control]  
**GitHub**: [@usuario1](https://github.com/usuario1)  
**Email**: [numero.control]@ensenada.tecnm.mx  
**Responsabilidades**:
- Arquitectura del sistema
- Configuración de MongoDB y Mongoose
- Diseño de APIs RESTful
- Revisión de código y documentación técnica

### 👩‍💻 Integrante 2 - [Nombre Completo]
**Rol**: Backend Developer & Security  
**No. Control**: [Número de Control]  
**GitHub**: [@usuario2](https://github.com/usuario2)  
**Email**: [numero.control]@ensenada.tecnm.mx  
**Responsabilidades**:
- Sistema de autenticación JWT
- Middlewares de seguridad (Helmet, CORS)
- Rate limiting y validaciones
- Implementación de bcrypt para contraseñas

### 👨‍💻 Integrante 3 - [Nombre Completo]
**Rol**: AI Integration & API Development  
**No. Control**: [Número de Control]  
**GitHub**: [@usuario3](https://github.com/usuario3)  
**Email**: [numero.control]@ensenada.tecnm.mx  
**Responsabilidades**:
- Integración con Google Gemini API
- Procesamiento de archivos multimedia (Sharp, Multer)
- Servicios de IA y análisis de PDFs
- Optimización de prompts y respuestas

### 👩‍💻 Integrante 4 - [Nombre Completo]
**Rol**: DevOps & Documentation  
**No. Control**: [Número de Control]  
**GitHub**: [@usuario4](https://github.com/usuario4)  
**Email**: [numero.control]@ensenada.tecnm.mx  
**Responsabilidades**:
- Configuración de deployment y variables de entorno
- Documentación técnica (README, ARCHITECTURE)
- Swagger/OpenAPI documentation
- Winston logging system

### 👨‍💻 Integrante 5 - [Nombre Completo]
**Rol**: Database & Quality Assurance  
**No. Control**: [Número de Control]  
**GitHub**: [@usuario5](https://github.com/usuario5)  
**Email**: [numero.control]@ensenada.tecnm.mx  
**Responsabilidades**:
- Diseño de esquemas de MongoDB
- Testing y validación de funcionalidades
- Manejo de errores y logging
- Optimización de queries y performance

---

## Código de Conducta

### Nuestros Compromisos

Como estudiantes del Tecnológico Nacional de México Campus Ensenada, nos comprometemos a mantener un ambiente de colaboración profesional, respetuoso y académicamente íntegro.

### Valores Institucionales

- **Excelencia Académica**: Búsqueda constante de la calidad en el trabajo
- **Integridad**: Honestidad en el desarrollo y documentación del código
- **Colaboración**: Trabajo en equipo efectivo y comunicación clara
- **Innovación**: Aplicación de nuevas tecnologías y mejores prácticas
- **Responsabilidad**: Cumplimiento de compromisos y plazos establecidos

### Nuestros Estándares

**Ejemplos de comportamiento que contribuyen a crear un ambiente positivo**:
- Uso de lenguaje profesional y técnico adecuado
- Respeto a puntos de vista y experiencias diferentes
- Aceptación de crítica constructiva del profesor y compañeros
- Enfoque en lo que es mejor para el proyecto académico
- Mostrar empatía y apoyo hacia otros integrantes del equipo

**Ejemplos de comportamiento inaceptable**:
- Plagio de código o documentación
- Comentarios despectivos hacia el trabajo de otros
- Falta de comunicación con el equipo
- Incumplimiento de responsabilidades asignadas
- No dar crédito apropiado a fuentes externas

### Aplicación

Los casos de comportamiento inaceptable serán reportados al profesor de la materia y manejados conforme al reglamento institucional del TecNM.

---

## Cómo Contribuir

### Para Estudiantes del Proyecto

Si eres parte del equipo de desarrollo:

1. Revisa el tablero de tareas del proyecto
2. Coordina con tu equipo antes de empezar una nueva funcionalidad
3. Documenta todo el código que escribas
4. Realiza commits frecuentes con mensajes descriptivos
5. Solicita revisión de código antes de merge

### Para Colaboradores Externos

Agradecemos el interés de la comunidad en contribuir:

1. Revisa los [Issues abiertos](https://github.com/tu-usuario/gemini-api-server/issues)
2. Busca si ya existe un issue similar
3. Crea un nuevo issue describiendo tu propuesta
4. Espera feedback del equipo antes de empezar
5. Sigue los estándares de código del proyecto

---

## Proceso de Desarrollo

### 1. Setup del Entorno de Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/gemini-api-server.git
cd gemini-api-server

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Editar .env con credenciales del equipo
# MongoDB Atlas compartido o local
# API Key de Gemini (proporcionada por el equipo)
```

### 2. Crear una Branch

```bash
# Actualizar rama principal
git checkout main
git pull origin main

# Crear branch descriptiva
git checkout -b feature/nombre-funcionalidad

# Para bugfix
git checkout -b fix/descripcion-bug

# Para documentación
git checkout -b docs/tema-documentacion
```

### 3. Desarrollo

- Escribe código limpio siguiendo los estándares del proyecto
- Agrega comentarios explicativos en español
- Actualiza documentación si modificas funcionalidad existente
- Prueba tu código localmente antes de hacer commit
- Verifica que no rompas funcionalidad existente

### 4. Commits

```bash
# Agregar cambios
git add .

# Commit con mensaje descriptivo en español
git commit -m "feat: agregar validación de formato de email"

# Push a tu branch
git push origin feature/nombre-funcionalidad
```

### 5. Pull Request

1. Crea PR en GitHub
2. Asigna a otro integrante del equipo para revisión
3. Describe los cambios realizados
4. Incluye screenshots si aplica
5. Espera aprobación antes de merge

---

## Estándares de Código

### Nomenclatura

```javascript
// Variables y funciones: camelCase en inglés
const userName = 'Juan';
const getUserData = async () => {};

// Clases: PascalCase
class UserService {}

// Constantes: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10485760;
const JWT_EXPIRATION = '7d';

// Archivos: kebab-case
// user-service.js, auth-controller.js
```

### Comentarios

```javascript
/**
 * Registra un nuevo usuario en el sistema
 * Valida email único y hashea la contraseña con bcrypt
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @returns {Promise<void>}
 */
const register = async (req, res) => {
  // Extraer datos del body
  const { username, email, password } = req.body;
  
  // Verificar si el email ya existe
  const existingUser = await User.findOne({ email });
  
  // Resto de la lógica...
};

// Comentarios inline en español para lógica compleja
const hashedPassword = await bcrypt.hash(password, 10); // 10 rounds de salt
```

### Estructura de Archivos

```javascript
// 1. Imports de módulos de Node.js
const path = require('path');
const fs = require('fs');

// 2. Imports de librerías externas
const express = require('express');
const jwt = require('jsonwebtoken');

// 3. Imports de configuración
const config = require('./config');

// 4. Imports de middlewares
const { authenticate } = require('./middlewares/auth');

// 5. Imports de servicios
const userService = require('./services/user.service');

// 6. Imports de utilidades
const logger = require('./utils/logger');

// Código principal...

// Export al final del archivo
module.exports = { funcionPrincipal };
```

### Manejo de Errores

```javascript
// Siempre usar try-catch en funciones async
const getUser = async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// O usar asyncHandler wrapper
const getUser = asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  
  res.json({ success: true, data: user });
});
```

### Validaciones

```javascript
// Usar express-validator
const { body, validationResult } = require('express-validator');

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('El username debe tener entre 3 y 30 caracteres')
];
```

---

## Convenciones de Commits

### Formato

```
<tipo>: <descripción breve>

<descripción detallada opcional>

<footer opcional>
```

### Tipos de Commits

- **feat**: Nueva funcionalidad
- **fix**: Corrección de bug
- **docs**: Cambios en documentación
- **style**: Cambios de formato (no afectan lógica)
- **refactor**: Refactorización de código
- **test**: Agregar o modificar tests
- **chore**: Tareas de mantenimiento

### Ejemplos

```bash
feat: agregar endpoint de cambio de contraseña

Implementa POST /api/auth/change-password con:
- Validación de contraseña actual
- Hash de nueva contraseña con bcrypt
- Actualización en base de datos

git commit -m "feat: agregar endpoint de cambio de contraseña"
```

```bash
fix: corregir error en validación de JWT

El middleware authenticate no manejaba correctamente
tokens expirados, causando error 500 en lugar de 401

git commit -m "fix: corregir error en validación de JWT"
```

```bash
docs: actualizar README con instrucciones de instalación

git commit -m "docs: actualizar README con instrucciones de instalación"
```

---

## Pull Requests

### Plantilla de PR

```markdown
## Descripción
Breve descripción de los cambios realizados

## Tipo de cambio
- [ ] Nueva funcionalidad
- [ ] Corrección de bug
- [ ] Documentación
- [ ] Refactorización

## ¿Cómo se ha probado?
Describe las pruebas realizadas

## Checklist
- [ ] Mi código sigue los estándares del proyecto
- [ ] He agregado comentarios en código complejo
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan warnings
- [ ] He probado localmente todas las funcionalidades
- [ ] No rompo funcionalidad existente

## Screenshots (si aplica)
Agrega capturas de pantalla si son relevantes
```

### Proceso de Revisión

1. Otro integrante del equipo revisa el código
2. Se solicitan cambios si es necesario
3. El autor realiza los ajustes solicitados
4. Se aprueba el PR
5. Se hace merge a main
6. Se elimina la branch feature

---

## Reportar Bugs

### Plantilla de Bug Report

```markdown
**Descripción del bug**
Descripción clara y concisa del problema

**Pasos para reproducir**
1. Ir a '...'
2. Hacer click en '...'
3. Ejecutar '...'
4. Ver error

**Comportamiento esperado**
Qué debería suceder

**Comportamiento actual**
Qué está sucediendo

**Screenshots**
Agrega capturas si ayudan a explicar el problema

**Entorno**
- OS: [Windows 11 / macOS / Linux]
- Node.js: [v18.17.0]
- npm: [v9.6.7]
- MongoDB: [v7.0.2]

**Información adicional**
Cualquier otro contexto sobre el problema
```

---

## Solicitar Features

### Plantilla de Feature Request

```markdown
**¿El feature está relacionado con un problema?**
Descripción clara del problema que resuelve

**Describe la solución que propones**
Descripción clara de lo que quieres que suceda

**Describe alternativas consideradas**
Otras soluciones o features que consideraste

**Información adicional**
Contexto adicional, screenshots, mockups, etc.
```

---

## Recursos Útiles

### Documentación de Tecnologías

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [Mongoose Docs](https://mongoosejs.com/docs/guide.html)
- [Google Gemini API](https://ai.google.dev/docs)
- [JWT Documentation](https://jwt.io/introduction)

### Tutoriales Recomendados

- [REST API Best Practices](https://restfulapi.net/)
- [JavaScript Clean Code](https://github.com/ryanmcdermott/clean-code-javascript)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Herramientas de Desarrollo

- **VS Code**: Editor recomendado
- **Postman**: Testing de APIs
- **MongoDB Compass**: Cliente visual de MongoDB
- **Git**: Control de versiones

---

## Contacto del Equipo

Para preguntas o dudas sobre el proyecto:

**Email del Equipo**: gemini-api-team@ensenada.tecnm.mx  
**Repositorio**: [https://github.com/tu-usuario/gemini-api-server](https://github.com/tu-usuario/gemini-api-server)  
**Documentación**: Ver carpeta `/docs` del repositorio

**Profesor Asesor**: [Nombre del Profesor]  
**Email**: [profesor]@ensenada.tecnm.mx

---

## Agradecimientos

Agradecemos al Tecnológico Nacional de México Campus Ensenada por proporcionar las herramientas y conocimientos necesarios para el desarrollo de este proyecto.

**Institución**: Tecnológico Nacional de México  
**Campus**: Ensenada, Baja California  
**Periodo**: Agosto - Diciembre 2025

---

**Última Actualización**: Octubre 2025  
**Proyecto Académico**: Desarrollo de Aplicaciones Web  
**TecNM Campus Ensenada**