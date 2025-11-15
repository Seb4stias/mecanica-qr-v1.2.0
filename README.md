# Sistema de Gestión de Acceso Vehicular - INACAP

Sistema web para gestionar permisos de acceso vehicular con códigos QR.

## Características

- ✅ Solicitud de permisos de acceso vehicular con foto
- ✅ Sistema de aprobación de dos niveles independientes
- ✅ Generación automática de códigos QR y PDFs
- ✅ Validación de QR mediante escáner con cámara
- ✅ Gestión de usuarios y roles
- ✅ Cambio de contraseña para todos los usuarios
- ✅ Eliminación de solicitudes (admin nivel 2)
- ✅ Descarga de QR y formularios PDF
- ✅ Auditoría de aprobaciones y rechazos

## Roles de Usuario

### Estudiante (student)
- Crear solicitudes de permiso vehicular
- Ver estado de sus solicitudes
- Descargar QR y formulario PDF cuando esté aprobada
- Cambiar su contraseña

### Admin Nivel 1 (admin_level1)
- Ver todas las solicitudes
- Aprobar solicitudes (aprobación nivel 1)
- Rechazar solicitudes con razón
- Ver quién aprobó/rechazó cada solicitud
- Cambiar su contraseña

### Admin Nivel 2 (admin_level2)
- Todas las funciones de Admin Nivel 1
- Aprobar solicitudes (aprobación nivel 2)
- Eliminar solicitudes
- Crear y gestionar usuarios
- Ver lista completa de usuarios registrados

### Scanner (scanner)
- Escanear códigos QR con la cámara
- Ver información completa del vehículo y estudiante
- Validar si el acceso está autorizado
- Ver historial de escaneos

## Flujo de Aprobación

1. **Estudiante** crea una solicitud con datos del vehículo y foto
2. **Estado: Pendiente** - Esperando revisión
3. **Admin Nivel 1** revisa y aprueba → **Estado: Aprobada Nivel 1**
4. **Admin Nivel 2** revisa y aprueba → **Estado: Aprobada**
5. Se genera automáticamente el **código QR y PDF**
6. **Estudiante** puede descargar QR y formulario
7. **Scanner** valida el QR en el punto de acceso

**Nota importante:** 
- Se necesitan **2 aprobaciones** (una de cada nivel) para aprobar completamente
- Cualquier admin puede **rechazar** en cualquier momento
- Si se rechaza, la solicitud queda **rechazada inmediatamente**
- Solo **admin nivel 2** puede eliminar solicitudes

## Instalación Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor
npm start
```

## Despliegue en Coolify

### Pasos para Deploy

1. **Crear base de datos MariaDB en Coolify**
   - Ve a tu proyecto en Coolify
   - Crea un nuevo recurso de tipo "Database"
   - Selecciona MariaDB
   - Guarda las credenciales que te proporciona

2. **Conectar repositorio de GitHub**
   - Conecta tu repositorio a Coolify
   - Selecciona la rama `main` o la que uses

3. **Configurar variables de entorno**
   
   En la sección "Environment Variables" de Coolify, agrega:
   
   **Variables de Base de Datos** (Coolify las proporciona automáticamente al vincular la BD):
   ```
   DB_HOST=<host-de-coolify>
   DB_USER=<usuario-de-coolify>
   DB_PASSWORD=<password-de-coolify>
   DB_DATABASE=<nombre-de-bd>
   DB_PORT=3306
   ```
   
   **Variables de Aplicación** (debes configurarlas manualmente):
   ```
   NODE_ENV=production
   PORT=3000
   SESSION_SECRET=<genera-cadena-aleatoria-segura>
   QR_EXPIRY_DAYS=30
   ```
   
   **Variables de Email** (opcional, para notificaciones):
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=tu-correo@gmail.com
   EMAIL_PASSWORD=<contraseña-de-aplicacion>
   EMAIL_FROM=Sistema Vehicular <tu-correo@gmail.com>
   ```

4. **Deploy**
   - Haz clic en "Deploy" o "Force Deploy"
   - La aplicación se desplegará automáticamente
   - La base de datos se inicializará en el primer arranque

### Inicialización Automática

El sistema realiza automáticamente al iniciar por primera vez:

1. ✅ Crea la base de datos si no existe
2. ✅ Ejecuta el schema SQL (crea todas las tablas)
3. ✅ Crea el usuario administrador por defecto
4. ✅ Inicia el servidor

**Usuario Administrador por Defecto:**
- **Email**: admin@inacap.cl
- **Password**: admin123
- **RUT**: No configurado (debes agregarlo manualmente en la BD)

⚠️ **IMPORTANTE**: 
- El login requiere RUT, no email
- Debes agregar un RUT al usuario admin en la base de datos para poder iniciar sesión
- O crear un nuevo usuario admin con RUT desde el registro

### Primer Acceso al Sistema

**Opción 1: Agregar RUT al admin por defecto**
Ejecuta en la base de datos:
```sql
UPDATE users SET rut = '12345678-9' WHERE email = 'admin@inacap.cl';
```

**Opción 2: Registrar un nuevo usuario**
1. Ve a `/register.html`
2. Completa el formulario con tu RUT
3. Inicia sesión con tu RUT y contraseña

### Problemas Comunes y Soluciones

#### Error: "MODULE_NOT_FOUND"
**Causa**: Archivos no subidos a GitHub  
**Solución**: Asegúrate de hacer `git add .` y `git push` de todos los archivos

#### Error: "ECONNREFUSED ::1:3306"
**Causa**: Variables de entorno no configuradas correctamente  
**Solución**: Verifica que las variables `DB_HOST`, `DB_USER`, `DB_PASSWORD` estén configuradas en Coolify

#### Error: "SQL syntax error near 'IF NOT EXISTS'"
**Causa**: MariaDB no soporta `CREATE INDEX IF NOT EXISTS`  
**Solución**: Ya corregido en `database/schema.sql` (sin IF NOT EXISTS en índices)

#### Error: "Table doesn't exist" (Race Condition)
**Causa**: El servidor arranca antes de que las tablas se creen  
**Solución**: Ya corregido en `server/server.js` (importa `app` después de inicializar BD)

#### Error: "ENOENT: no such file or directory" al descargar QR
**Causa**: La carpeta `public/qr-codes/` no existe  
**Solución**: Ya corregido - se crea automáticamente al generar el primer QR

#### Error: Estado "En Proceso" cuando ambos niveles aprobaron
**Causa**: El estado no se actualizaba a "approved" correctamente  
**Solución**: Ya corregido - se verifica el estado después de cada aprobación

#### App en estado "DEGRADED (unhealthy)"
**Causa**: La app crashea en bucle, generalmente por problemas de conexión a BD  
**Solución**: 
1. Revisa los logs en Coolify
2. Verifica las variables de entorno
3. Asegúrate de que la BD MariaDB esté corriendo
4. Haz "Force Deploy" para reconstruir sin cache

## Estructura del Proyecto

```
├── server/
│   ├── config/         # Configuración de base de datos
│   ├── routes/         # Rutas de la API
│   ├── middleware/     # Middlewares de autenticación
│   ├── scripts/        # Scripts de utilidad
│   ├── app.js          # Configuración de Express
│   └── server.js       # Punto de entrada
├── public/             # Archivos estáticos
│   ├── uploads/        # Fotos de vehículos
│   └── qr-codes/       # QR generados
├── database/
│   └── schema.sql      # Esquema de base de datos
└── .env.example        # Plantilla de variables de entorno
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario (estudiante)
  - Body: `{ name, rut, email, password, carrera?, phone? }`
  - Crea automáticamente una sesión
- `POST /api/auth/login` - Iniciar sesión con RUT
  - Body: `{ rut, password }`
  - Retorna información del usuario y rol
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/session` - Verificar sesión activa
- `POST /api/auth/change-password` - Cambiar contraseña
  - Body: `{ currentPassword, newPassword }`

### Solicitudes (Estudiantes)
- `POST /api/requests` - Crear solicitud con foto del vehículo
  - Multipart form data con campos del estudiante y vehículo
- `GET /api/requests` - Listar mis solicitudes
- `GET /api/requests/:id` - Ver detalle de solicitud
- `GET /api/requests/:id/qr` - Descargar imagen QR (solo si está aprobada)
- `GET /api/requests/:id/pdf` - Descargar formulario PDF con QR

### Administración (Admin Nivel 1 y 2)
- `GET /api/admin/requests` - Listar todas las solicitudes
  - Query params: `?status=pending,level1_approved,level2_approved,approved,rejected`
- `GET /api/admin/requests/:id` - Ver detalle completo de solicitud
- `POST /api/admin/requests/:id/approve` - Aprobar solicitud
  - Admin nivel 1: Aprueba nivel 1
  - Admin nivel 2: Aprueba nivel 2
  - Se necesitan ambas aprobaciones para generar QR
- `POST /api/admin/requests/:id/reject` - Rechazar solicitud
  - Body: `{ reason }` (obligatorio)
  - Cualquier nivel puede rechazar
- `DELETE /api/admin/requests/:id` - Eliminar solicitud (solo nivel 2)

### Escáner (Rol Scanner)
- `POST /api/scanner/validate` - Validar código QR escaneado
  - Body: `{ qrData }`
  - Retorna información del vehículo y estado de validez
- `GET /api/scanner/history` - Historial de escaneos

### Gestión de Usuarios (Solo Admin Nivel 2)
- `GET /api/admin/users` - Listar todos los usuarios
- `POST /api/admin/users` - Crear nuevo usuario
  - Body: `{ name, rut, email, password, role }`

## Tecnologías

### Backend
- Node.js + Express
- MariaDB (MySQL) con mysql2
- bcrypt (encriptación de contraseñas)
- express-session (manejo de sesiones)
- QRCode (generación de códigos QR)
- PDFKit (generación de PDFs)
- Multer (subida de archivos/fotos)

### Frontend
- HTML5 + CSS3
- JavaScript Vanilla
- jsQR (lectura de códigos QR con cámara)
- Fetch API (comunicación con backend)

## Páginas del Sistema

- `/index.html` - Login con RUT y contraseña
- `/register.html` - Registro de nuevos estudiantes
- `/student.html` - Panel de estudiante
  - Nueva solicitud
  - Mis solicitudes
  - Mi cuenta (cambiar contraseña)
- `/admin.html` - Panel de administración (nivel 1 y 2)
  - Solicitudes pendientes
  - Solicitudes aprobadas
  - Solicitudes rechazadas
  - Gestión de usuarios (solo nivel 2)
  - Mi cuenta (cambiar contraseña)
- `/scanner.html` - Panel de escáner QR
  - Activar cámara
  - Escanear QR
  - Ver información del vehículo
  - Validar acceso


## Migración de SQLite a MariaDB

Este proyecto fue migrado de SQLite a MariaDB para compatibilidad con Coolify.

### Cambios Realizados

1. **Dependencias**
   - ❌ Removido: `sqlite3`
   - ✅ Agregado: `mysql2`

2. **Configuración de Base de Datos**
   - Creado `server/config/database.js` con pool de conexiones MariaDB
   - Función `initializeDatabase()` que ejecuta `schema.sql` automáticamente
   - Manejo de errores para índices duplicados

3. **Schema SQL**
   - Adaptado de SQLite a MariaDB
   - Cambiado `AUTOINCREMENT` por `AUTO_INCREMENT`
   - Removido `IF NOT EXISTS` de `CREATE INDEX` (no soportado en MariaDB)
   - Agregado `ENGINE=InnoDB` y `CHARSET=utf8mb4`

4. **Inicialización del Servidor**
   - `server.js` ahora espera a que la BD esté lista antes de importar `app.js`
   - Previene race conditions donde el servidor arranca antes de crear las tablas
   - Logs detallados para debugging

### Errores Resueltos Durante la Migración

#### 1. MODULE_NOT_FOUND './routes/auth'
**Problema**: Las carpetas `routes/`, `controllers/`, `middleware/` estaban vacías  
**Causa**: Archivos no fueron subidos a GitHub  
**Solución**: Recreados todos los archivos de rutas y middleware

#### 2. ECONNREFUSED localhost:3306
**Problema**: App intentaba conectarse a localhost en lugar de la BD de Coolify  
**Causa**: Variables de entorno no estaban siendo leídas  
**Solución**: Agregados logs de debug para verificar variables, confirmado que el código SÍ las lee correctamente

#### 3. SQL Syntax Error en CREATE INDEX
**Problema**: `CREATE INDEX IF NOT EXISTS` no es válido en MariaDB  
**Causa**: Sintaxis de SQLite incompatible con MariaDB  
**Solución**: Removido `IF NOT EXISTS` de los índices, agregado manejo de errores para `ER_DUP_KEYNAME`

#### 4. Table 'mecanica.requests' doesn't exist (Race Condition)
**Problema**: El servidor arrancaba antes de que las tablas se crearan  
**Causa**: `app.js` se importaba al inicio, ejecutando código que usa la BD antes de inicializarla  
**Solución**: Movida la importación de `app.js` dentro del `.then()` después de `setupDatabase()`

#### 5. App en estado DEGRADED
**Problema**: App crasheaba y se reiniciaba en bucle  
**Causa**: Múltiples errores encadenados (variables de entorno, sintaxis SQL, race condition)  
**Solución**: Corregidos todos los errores anteriores + agregado `throw error` en catch para evitar que el servidor arranque con errores

### Lecciones Aprendidas

1. **Variables de Entorno**: Coolify inyecta las variables automáticamente al vincular la BD, pero debes verificar que los nombres coincidan exactamente
2. **Compatibilidad SQL**: SQLite y MariaDB tienen diferencias de sintaxis, especialmente en índices y tipos de datos
3. **Race Conditions**: En Node.js, los `require()` se ejecutan inmediatamente, causando problemas si dependen de inicialización asíncrona
4. **Debugging en Producción**: Logs detallados son esenciales para diagnosticar problemas en entornos como Coolify donde no tienes acceso directo
5. **Force Deploy**: Coolify cachea builds por commit SHA, usa "Force Deploy" cuando cambies dependencias o configuración

## Historial de Versiones

### v1.2.2 - Versión Estable (Actual)
- ✅ Generación automática de carpetas para QR y uploads
- ✅ Corrección de estado "approved" cuando ambos niveles aprueban
- ✅ Visualización de fotos de vehículos en todas las listas
- ✅ Mostrar nombres de admins que aprobaron/rechazaron
- ✅ Logs detallados para debugging
- ✅ Rutas absolutas para archivos QR y PDF

### v1.2.1 - Sistema Completo
- ✅ Flujo de aprobación de 2 niveles independientes
- ✅ Generación de QR y PDF al aprobar
- ✅ Descarga de QR y formularios
- ✅ Panel de scanner con validación en tiempo real
- ✅ Cambio de contraseña para todos los usuarios
- ✅ Eliminación de solicitudes (admin nivel 2)
- ✅ Gestión completa de usuarios
- ✅ Auditoría de quién aprobó/rechazó
- ✅ Pop-ups de error y éxito
- ✅ Validación de campos en formularios

### v1.2.0 - Migración a MariaDB
- Migrado de SQLite a MariaDB
- Compatibilidad con Coolify
- Inicialización automática de base de datos
- Corrección de race conditions
- Usuario admin configurable por variables de entorno
- Mejoras en logging y debugging

### v1.1.0 - Sistema de Autenticación
- Agregado registro de usuarios
- Login con RUT
- Validaciones de RUT y email duplicados
- Redirección automática según rol

### v1.0.0 - Versión Inicial
- Sistema básico con SQLite
- Gestión de solicitudes y aprobaciones
- Generación de códigos QR
