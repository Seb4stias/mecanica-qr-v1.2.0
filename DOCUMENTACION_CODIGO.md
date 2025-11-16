# Documentación del Sistema de Gestión de Acceso Vehicular

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Base de Datos](#base-de-datos)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Flujo de Funcionamiento](#flujo-de-funcionamiento)
6. [Componentes Principales](#componentes-principales)
7. [Scripts de Configuración](#scripts-de-configuración)

---

## Descripción General

Sistema web para gestionar el acceso vehicular en INACAP mediante códigos QR. Permite a estudiantes solicitar permisos de estacionamiento que deben ser aprobados por dos niveles de administradores.

### Tecnologías Utilizadas
- **Backend:** Node.js + Express
- **Base de Datos:** MariaDB (MySQL)
- **Autenticación:** Sesiones con express-session
- **Seguridad:** bcrypt para contraseñas, helmet para headers HTTP
- **QR:** Librería qrcode para generar códigos
- **PDF:** PDFKit para generar documentos
- **Email:** Nodemailer para notificaciones

---

## Arquitectura del Sistema

### Roles de Usuario
1. **Estudiante (student):** Solicita permisos de acceso vehicular
2. **Admin Scanner (scanner):** Escanea códigos QR en la entrada
3. **Admin Nivel 1 (admin_level1):** Primera aprobación de solicitudes + acceso a escáner QR
4. **Admin Nivel 2 (admin_level2):** Aprobación final, gestión completa + acceso a escáner QR

### Flujo de Aprobación
```
Estudiante → Solicitud → Admin Nivel 1 → Admin Nivel 2 → QR Generado
                ↓                              ↓
         (Puede aprobar nivel 1)    (Puede aprobar nivel 1 o 2)
```

**Nota:** Admin Nivel 2 puede aprobar en cualquier momento, incluso si falta la aprobación de Nivel 1.

---

## Base de Datos

### Configuración Automática
El sistema **crea automáticamente** la base de datos al iniciar si no existe.

**Archivo:** `server/server.js`
```javascript
// Al iniciar el servidor:
1. Conecta al servidor MariaDB
2. Crea la base de datos 'mecanica' si no existe
3. Verifica si hay tablas
4. Si no hay tablas, ejecuta el schema.sql
5. Crea el usuario administrador inicial
6. Inicia el servidor
```

### Tablas Principales

#### 1. **users** - Usuarios del sistema
```sql
- id: Identificador único
- email: Correo electrónico (único)
- password_hash: Contraseña encriptada con bcrypt
- role: Rol del usuario (student, admin_scanner, admin_level1, admin_level2)
- name: Nombre completo
- rut: RUT chileno (único)
- carrera: Carrera del estudiante
- phone: Teléfono de contacto
- created_at: Fecha de creación
- created_by: ID del admin que creó la cuenta
- is_active: Si la cuenta está activa
```

#### 2. **requests** - Solicitudes de permiso
```sql
- id: Identificador único
- user_id: ID del estudiante que solicita
- student_name, student_rut, student_carrera, etc.: Datos del estudiante
- vehicle_plate: Patente del vehículo
- vehicle_model: Modelo del vehículo
- vehicle_color: Color del vehículo
- vehicle_photo_path: Ruta de la foto del vehículo
- status: Estado (pending, approved, denied)
- level1_approved: Aprobación del admin nivel 1
- level1_admin_id: ID del admin nivel 1 que aprobó
- level1_date: Fecha de aprobación nivel 1
- level2_approved: Aprobación del admin nivel 2
- level2_admin_id: ID del admin nivel 2 que aprobó
- level2_date: Fecha de aprobación nivel 2
- denial_reason: Motivo de rechazo
```

#### 3. **qr_codes** - Códigos QR generados
```sql
- id: Identificador único
- request_id: ID de la solicitud aprobada
- qr_data: Datos codificados en JSON
- qr_image_path: Ruta de la imagen QR
- pdf_path: Ruta del PDF generado
- generated_at: Fecha de generación
- expires_at: Fecha de expiración
- is_active: Si el QR está activo
```

#### 4. **account_requests** - Solicitudes de cuentas
```sql
- id: Identificador único
- requested_email: Email de la cuenta solicitada
- requested_name: Nombre de la cuenta solicitada
- requested_role: Rol solicitado
- requested_by: ID del admin nivel 1 que solicita
- status: Estado (pending, approved, rejected)
- reviewed_by: ID del admin nivel 2 que revisó
```

#### 5. **audit_logs** - Registro de auditoría
```sql
- id: Identificador único
- user_id: ID del usuario que realizó la acción
- action: Descripción de la acción
- entity_type: Tipo de entidad (request, user, qr_code)
- entity_id: ID de la entidad afectada
- details: Detalles adicionales en JSON
- ip_address: Dirección IP del usuario
- created_at: Fecha de la acción
```

#### 6. **password_reset_tokens** - Tokens de recuperación
```sql
- id: Identificador único
- user_id: ID del usuario
- token: Código de 6 dígitos
- expires_at: Fecha de expiración
- used: Si el token ya fue usado
```

---

## Estructura de Archivos

```
proyecto/
├── server/
│   ├── config/
│   │   └── database.js          # Configuración de conexión a MariaDB
│   ├── controllers/
│   │   ├── authController.js    # Login, logout, registro
│   │   ├── requestController.js # Gestión de solicitudes
│   │   ├── qrController.js      # Generación y validación de QR
│   │   └── userController.js    # Gestión de usuarios
│   ├── middleware/
│   │   ├── auth.js              # Verificación de autenticación
│   │   └── roleCheck.js         # Verificación de roles
│   ├── models/
│   │   ├── User.js              # Modelo de usuario
│   │   ├── Request.js           # Modelo de solicitud
│   │   └── QRCode.js            # Modelo de código QR
│   ├── routes/
│   │   ├── authRoutes.js        # Rutas de autenticación
│   │   ├── requestRoutes.js     # Rutas de solicitudes
│   │   ├── qrRoutes.js          # Rutas de QR
│   │   └── userRoutes.js        # Rutas de usuarios
│   ├── scripts/
│   │   ├── createDatabase.js    # Crea solo la BD
│   │   ├── initDb.js            # Crea BD + tablas + admin
│   │   └── setupAndStart.js     # Configura todo y arranca
│   ├── services/
│   │   ├── emailService.js      # Envío de emails
│   │   └── qrService.js         # Generación de QR y PDF
│   ├── utils/
│   │   └── validators.js        # Validaciones de datos
│   ├── app.js                   # Configuración de Express
│   └── server.js                # Punto de entrada (con auto-setup)
├── database/
│   └── schema.sql               # Esquema de la base de datos
├── public/
│   ├── css/                     # Estilos
│   ├── js/                      # JavaScript del frontend
│   ├── index.html               # Página de login
│   ├── register.html            # Página de registro
│   ├── student.html             # Dashboard del estudiante
│   ├── admin.html               # Dashboard de administradores
│   └── scanner.html             # Interfaz del escáner
├── .env                         # Variables de entorno
├── package.json                 # Dependencias
└── README.md                    # Documentación
```

---

## Flujo de Funcionamiento

### 1. Inicio del Servidor
```javascript
// server/server.js
1. Carga variables de entorno (.env)
2. Ejecuta setupDatabase():
   - Conecta a MariaDB
   - Crea BD si no existe
   - Verifica tablas
   - Inicializa si es necesario
3. Inicia servidor Express en el puerto configurado
```

### 2. Registro de Usuario (Estudiante)
```javascript
// Flujo:
1. Estudiante completa formulario en register.html
2. POST /api/auth/register
3. authController.register():
   - Valida datos (email, RUT, contraseña)
   - Verifica que no exista el email/RUT
   - Encripta contraseña con bcrypt
   - Crea usuario en BD con role='student'
4. Redirige a login
```

### 3. Login
```javascript
// Flujo:
1. Usuario ingresa email y contraseña
2. POST /api/auth/login
3. authController.login():
   - Busca usuario por email
   - Verifica contraseña con bcrypt.compare()
   - Crea sesión
   - Retorna datos del usuario
4. Redirige según rol:
   - student → student.html
   - admin_scanner → scanner.html
   - admin_level1/2 → admin.html
```

### 4. Solicitud de Permiso
```javascript
// Flujo:
1. Estudiante completa formulario con datos del vehículo
2. Sube foto del vehículo (multer guarda en /public/uploads)
3. POST /api/requests
4. requestController.createRequest():
   - Valida datos del vehículo
   - Guarda foto
   - Crea solicitud con status='pending'
   - Envía email a admin nivel 1
5. Solicitud queda pendiente de aprobación
```

### 5. Aprobación Nivel 1
```javascript
// Flujo:
1. Admin Nivel 1 ve solicitudes pendientes
2. Revisa datos y foto del vehículo
3. PUT /api/requests/:id/level1
4. requestController.approveLevel1():
   - Actualiza level1_approved=true
   - Guarda level1_admin_id y level1_date
   - Envía email a admin nivel 2
5. Solicitud pasa a esperar aprobación nivel 2
```

### 6. Aprobación Nivel 2 y Generación de QR
```javascript
// Flujo:
1. Admin Nivel 2 ve solicitudes aprobadas por nivel 1
2. Revisa y aprueba
3. PUT /api/requests/:id/level2
4. requestController.approveLevel2():
   - Actualiza level2_approved=true
   - Actualiza status='approved'
   - Llama a qrService.generateQR():
     a. Crea datos JSON con info del vehículo
     b. Genera imagen QR
     c. Genera PDF con QR y datos
     d. Guarda en BD tabla qr_codes
   - Envía email al estudiante con PDF adjunto
5. Estudiante recibe su QR por email
```

### 7. Escaneo de QR
```javascript
// Flujo:
1. Admin Scanner/Admin Nivel 1/Admin Nivel 2 escanea QR
   - Desde scanner.html (rol scanner)
   - Desde admin.html tab "Escáner QR" (admin_level1 o admin_level2)
2. POST /api/scanner/validate
3. scannerController.validateQR():
   - Decodifica datos del QR
   - Busca en BD con JOIN a requests para obtener foto
   - Verifica:
     * Que exista
     * Que esté activo (is_active=true)
     * Que no haya expirado
     * Que la solicitud esté aprobada
   - Registra en audit_logs
4. Muestra resultado:
   - ✓ Acceso permitido (verde) + FOTO DEL VEHÍCULO
     * Nombre del estudiante
     * RUT
     * Patente
     * Modelo y color
     * Foto del vehículo en grande
   - ✗ Acceso denegado (rojo) + razón
```

---

## Componentes Principales

### 0. Creación Automática de Directorios
```javascript
// server/server.js - createRequiredDirectories()
// Al iniciar el servidor, crea automáticamente:
- public/qr-codes/    # Para almacenar QR y PDFs generados
- public/uploads/     # Para almacenar fotos de vehículos

// Esto asegura que los directorios existan en contenedores Docker
```

### 1. database.js - Conexión a MariaDB
```javascript
// Funciones principales:

getPool()
// Retorna el pool de conexiones reutilizable

getConnection()
// Obtiene una conexión del pool

query(sql, params)
// Ejecuta consulta que retorna múltiples filas
// Ejemplo: query('SELECT * FROM users WHERE role = ?', ['student'])

queryOne(sql, params)
// Ejecuta consulta que retorna una sola fila
// Ejemplo: queryOne('SELECT * FROM users WHERE id = ?', [userId])

run(sql, params)
// Ejecuta INSERT, UPDATE, DELETE
// Retorna: { lastID, changes, insertId, affectedRows }

initializeDatabase()
// Crea tablas y usuario admin inicial
```

### 2. authController.js - Autenticación
```javascript
register(req, res)
// Registra nuevo estudiante
// Valida: email único, RUT válido, contraseña fuerte

login(req, res)
// Autentica usuario
// Crea sesión con express-session

logout(req, res)
// Destruye sesión

forgotPassword(req, res)
// Genera token de 6 dígitos
// Envía email con código

resetPassword(req, res)
// Valida token y cambia contraseña
```

### 3. requestController.js - Solicitudes
```javascript
createRequest(req, res)
// Crea nueva solicitud de permiso
// Guarda foto del vehículo

getMyRequests(req, res)
// Obtiene solicitudes del estudiante actual

getPendingRequests(req, res)
// Obtiene solicitudes pendientes (para admins)

approveLevel1(req, res)
// Primera aprobación

approveLevel2(req, res)
// Segunda aprobación + genera QR

denyRequest(req, res)
// Rechaza solicitud con motivo
```

### 4. qrService.js - Generación de QR
```javascript
generateQR(requestData)
// 1. Verifica/crea directorio public/qr-codes/
// 2. Crea objeto JSON con datos:
//    - ID de solicitud
//    - Patente
//    - Modelo
//    - Color
//    - Nombre estudiante
//    - RUT
//    - Fecha de generación
// 3. Genera imagen QR (PNG) en public/qr-codes/qr-{id}.png
// 4. Genera PDF con:
//    - Título y logo INACAP
//    - Datos del estudiante
//    - Datos del vehículo
//    - Foto del vehículo (si existe)
//    - Imagen QR
//    - Fecha de emisión
// 5. Guarda PDF en public/qr-codes/permit-{id}.pdf
// 6. Verifica que ambos archivos existan
// 7. Guarda rutas en BD (tabla qr_codes)
// 8. Retorna rutas de archivos

validateQR(qrData)
// 1. Decodifica JSON del QR
// 2. Busca en BD con JOIN a requests
// 3. Incluye vehicle_photo_path en la respuesta
// 4. Valida que el QR sea válido y no haya expirado
// 5. Retorna datos + foto del vehículo
```

### 5. emailService.js - Envío de Emails
```javascript
sendEmail(to, subject, html, attachments)
// Envía email usando nodemailer
// Configurado con Gmail SMTP

sendRequestNotification(adminEmail, requestData)
// Notifica a admin sobre nueva solicitud

sendApprovalNotification(studentEmail, qrPdfPath)
// Envía QR al estudiante aprobado

sendDenialNotification(studentEmail, reason)
// Notifica rechazo al estudiante
```

### 6. Middleware de Autenticación
```javascript
// middleware/auth.js
isAuthenticated(req, res, next)
// Verifica que el usuario tenga sesión activa

// middleware/roleCheck.js
requireRole(...roles)
// Verifica que el usuario tenga uno de los roles permitidos
// Ejemplo: requireRole('admin_level1', 'admin_level2')
```

---

## Scripts de Configuración

### createDatabase.js
```javascript
// Qué hace:
1. Conecta a MariaDB sin especificar BD
2. Ejecuta: CREATE DATABASE IF NOT EXISTS mecanica
3. Termina

// Cuándo usar:
npm run create-db
// Solo si quieres crear la BD manualmente
```

### initDb.js
```javascript
// Qué hace:
1. Crea la base de datos
2. Ejecuta schema.sql (crea todas las tablas)
3. Crea usuario admin inicial:
   - Email: admin@inacapmail.cl
   - RUT: 11111111-1
   - Password: Admin123!
   - Role: admin_level2

// Cuándo usar:
npm run init-db
// Primera vez que configuras el proyecto
```

### setupAndStart.js
```javascript
// Qué hace:
1. Crea BD si no existe
2. Verifica si hay tablas
3. Si no hay tablas, las crea
4. Inicia el servidor

// Cuándo usar:
npm run setup-and-start
// En Coolify o producción (hace todo automáticamente)
```

### server.js (con auto-setup)
```javascript
// Qué hace:
1. Al iniciar, ejecuta setupDatabase()
2. Crea BD si no existe
3. Verifica tablas
4. Inicializa si es necesario
5. Inicia servidor

// Cuándo usar:
npm start
// Uso normal - ahora crea la BD automáticamente
```

---

## Variables de Entorno (.env)

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de Datos MariaDB
DB_HOST=192.168.18.158
DB_USER=root
DB_PASSWORD=tu-password-segura
DB_DATABASE=mecanica
DB_PORT=3306

# Email (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
EMAIL_FROM=Sistema INACAP <tu-email@gmail.com>

# Sesiones
SESSION_SECRET=cambia-esto-por-algo-super-seguro

# QR
QR_EXPIRY_DAYS=30
```

---

## Seguridad Implementada

### 1. Contraseñas
- Encriptadas con bcrypt (10 rounds)
- Nunca se almacenan en texto plano
- Validación de fortaleza en registro

### 2. Sesiones
- express-session con secret seguro
- Cookies httpOnly
- Timeout de sesión

### 3. Headers HTTP
- Helmet.js para headers de seguridad
- CORS configurado
- Rate limiting en endpoints sensibles

### 4. Validación de Datos
- Validación de RUT chileno
- Validación de email
- Sanitización de inputs
- Validación de tipos de archivo (solo imágenes)

### 5. Control de Acceso
- Middleware de autenticación
- Middleware de roles
- Verificación de permisos en cada endpoint

---

## Flujo Completo de Ejemplo

```
1. Juan (estudiante) se registra
   → POST /api/auth/register
   → Se crea usuario con role='student'

2. Juan hace login
   → POST /api/auth/login
   → Se crea sesión
   → Redirige a student.html

3. Juan solicita permiso para su auto
   → Completa formulario con patente ABC123
   → Sube foto del auto (guardada en public/uploads/)
   → POST /api/requests
   → Se crea solicitud con status='pending'
   → Email a admin nivel 1

4. María (admin nivel 1) revisa
   → Ve solicitud en admin.html tab "Pendientes"
   → Revisa datos y foto del vehículo
   → POST /api/admin/requests/1/approve
   → level1_approved=1
   → status='level1_approved'
   → Falta aprobación nivel 2

5. Pedro (admin nivel 2) aprueba
   → Ve solicitud en admin.html tab "Pendientes"
   → POST /api/admin/requests/1/approve
   → level2_approved=1
   → status='approved'
   → Se genera automáticamente:
     * QR en public/qr-codes/qr-1.png
     * PDF en public/qr-codes/permit-1.pdf
   → Se guarda en tabla qr_codes
   → Email a Juan con PDF adjunto (opcional)

6. Juan descarga su QR
   → Desde student.html ve su solicitud aprobada
   → Descarga QR o PDF
   → Lo imprime y pega en su parabrisas

7. María (admin nivel 1) escanea el QR en la entrada
   → Abre admin.html → tab "📷 Escáner QR"
   → Activa cámara del celular/tablet
   → Escanea código QR del parabrisas
   → POST /api/scanner/validate
   → Sistema verifica:
     ✓ QR existe
     ✓ Está activo
     ✓ No ha expirado
     ✓ Solicitud está aprobada
   → Muestra en pantalla:
     ✓ "ACCESO AUTORIZADO" (fondo verde)
     ✓ FOTO DEL VEHÍCULO en grande
     ✓ Nombre: Juan Pérez
     ✓ RUT: 12345678-9
     ✓ Patente: ABC123
     ✓ Modelo: Toyota Corolla
     ✓ Color: Rojo
   → Juan puede entrar

8. Registro de auditoría
   → Se guarda en audit_logs:
     * user_id: ID de María
     * action: 'qr_scan'
     * entity_type: 'qr_code'
     * details: {valid: true, plate: 'ABC123'}
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor en modo desarrollo

# Producción
npm start                # Inicia servidor (con auto-setup de BD)

# Base de Datos
npm run create-db        # Solo crea la BD
npm run init-db          # Crea BD + tablas + admin
npm run setup-and-start  # Todo automático + inicia servidor

# Testing
npm test                 # Ejecuta tests
```

---

## Solución de Problemas Comunes

### Error: ECONNREFUSED
**Causa:** No se puede conectar a MariaDB
**Solución:**
- Verifica que MariaDB esté corriendo
- Verifica DB_HOST y DB_PORT en .env
- Verifica firewall

### Error: ER_ACCESS_DENIED_ERROR
**Causa:** Credenciales incorrectas
**Solución:**
- Verifica DB_USER y DB_PASSWORD en .env
- Verifica permisos del usuario en MariaDB

### Error: Cannot find module
**Causa:** Dependencias no instaladas
**Solución:**
```bash
npm install
```

### QR no se genera
**Causa:** Falta alguna aprobación o error en directorios
**Solución:**
- Verifica que level1_approved=1
- Verifica que level2_approved=1
- Verifica que exista el directorio public/qr-codes/
- Revisa logs del servidor para ver errores específicos
- En Docker/Coolify, verifica permisos de escritura

### Error: ENOENT no such file or directory (QR/PDF)
**Causa:** Directorio qr-codes no existe o no se creó el archivo
**Solución:**
- El servidor ahora crea automáticamente los directorios al iniciar
- Verifica logs: "✓ Directorio creado: /app/public/qr-codes"
- Verifica permisos de escritura en el contenedor
- Redeploy en Coolify para aplicar cambios

---

## Mantenimiento

### Backup de Base de Datos
```bash
mysqldump -h 192.168.18.158 -u root -p mecanica > backup.sql
```

### Restaurar Backup
```bash
mysql -h 192.168.18.158 -u root -p mecanica < backup.sql
```

### Limpiar QR Expirados
```sql
UPDATE qr_codes 
SET is_active = 0 
WHERE expires_at < NOW();
```

### Ver Logs de Auditoría
```sql
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

---

## Funcionalidades del Escáner QR

### Acceso al Escáner

**Usuarios con acceso:**
- Admin Nivel 1 (admin_level1)
- Admin Nivel 2 (admin_level2)
- Scanner (scanner)

**Ubicaciones:**
1. **Panel de Admin** (admin.html)
   - Tab "📷 Escáner QR"
   - Disponible para admin_level1 y admin_level2
   - Integrado en el mismo panel de administración

2. **Interfaz Dedicada** (scanner.html)
   - Para usuarios con rol 'scanner'
   - Interfaz simplificada solo para escanear

### Características del Escáner

#### 1. Activación de Cámara
```javascript
// Usa librería html5-qrcode
- Detecta automáticamente cámara del dispositivo
- Prioriza cámara trasera en móviles (facingMode: "environment")
- Escaneo continuo a 10 FPS
- Área de escaneo: 250x250px
```

#### 2. Validación en Tiempo Real
```javascript
// Al escanear un QR:
1. Decodifica JSON del código
2. Envía a POST /api/scanner/validate
3. Servidor verifica:
   - Existencia del QR en BD
   - Estado activo (is_active=1)
   - Fecha de expiración
   - Estado de la solicitud (debe ser 'approved')
4. Obtiene foto del vehículo desde requests
5. Retorna resultado + datos + foto
```

#### 3. Visualización de Resultados

**QR Válido (Acceso Autorizado):**
```
┌─────────────────────────────────────┐
│  ✅ ACCESO AUTORIZADO               │
│  (Fondo verde)                      │
├─────────────────────────────────────┤
│  [FOTO DEL VEHÍCULO EN GRANDE]      │
│                                     │
│  Estudiante: Juan Pérez             │
│  RUT: 12.345.678-9                  │
│  Patente: ABC123                    │
│  Modelo: Toyota Corolla             │
│  Color: Rojo                        │
│  Válido hasta: 15/12/2024           │
│                                     │
│  [Botón: Escanear Otro QR]          │
└─────────────────────────────────────┘
```

**QR Inválido (Acceso Denegado):**
```
┌─────────────────────────────────────┐
│  ❌ ACCESO DENEGADO                 │
│  (Fondo rojo)                       │
├─────────────────────────────────────┤
│  Razón: Código QR expirado          │
│                                     │
│  Estudiante: Juan Pérez             │
│  RUT: 12.345.678-9                  │
│  Patente: ABC123                    │
│                                     │
│  [Botón: Escanear Otro QR]          │
└─────────────────────────────────────┘
```

#### 4. Registro de Auditoría
```sql
-- Cada escaneo se registra en audit_logs
INSERT INTO audit_logs (
  user_id,        -- ID del admin que escaneó
  action,         -- 'qr_scan'
  entity_type,    -- 'qr_code'
  entity_id,      -- ID del QR
  details,        -- JSON: {valid: true/false, plate: 'ABC123'}
  ip_address,     -- IP del dispositivo
  created_at      -- Timestamp
)
```

### Casos de Uso del Escáner

#### Caso 1: Entrada Normal
```
1. Vehículo llega a la entrada
2. Admin escanea QR del parabrisas
3. Sistema muestra foto del vehículo
4. Admin verifica que el vehículo coincida con la foto
5. Si coincide → permite el acceso
6. Si no coincide → investiga (posible QR robado)
```

#### Caso 2: QR Expirado
```
1. Admin escanea QR
2. Sistema detecta fecha de expiración pasada
3. Muestra: "❌ ACCESO DENEGADO - Código QR expirado"
4. Admin niega el acceso
5. Estudiante debe solicitar renovación
```

#### Caso 3: QR Inactivo
```
1. Admin escanea QR
2. Sistema detecta is_active=0
3. Muestra: "❌ ACCESO DENEGADO - Código QR no encontrado o inactivo"
4. Posibles razones:
   - QR fue revocado por admin
   - Solicitud fue rechazada después
   - QR fue desactivado manualmente
```

#### Caso 4: Verificación de Vehículo
```
1. Admin escanea QR válido
2. Sistema muestra foto del vehículo registrado
3. Admin compara visualmente:
   - Color del vehículo
   - Modelo
   - Características visibles
4. Si hay discrepancia → reporta a admin nivel 2
```

### Ventajas del Sistema

1. **Verificación Visual:** La foto del vehículo permite confirmar que el QR no fue robado o transferido
2. **Historial Completo:** Todos los escaneos quedan registrados en audit_logs
3. **Acceso Múltiple:** Varios admins pueden escanear simultáneamente
4. **Responsive:** Funciona en celulares, tablets y computadoras
5. **Sin Instalación:** Solo necesita navegador web con cámara

---

## Actualizaciones Recientes

### v1.2.0 - Mejoras en QR y Escáner
**Fecha:** Noviembre 2024

**Cambios:**
1. ✅ Creación automática de directorios al iniciar servidor
   - `public/qr-codes/` para QR y PDFs
   - `public/uploads/` para fotos de vehículos
   - Soluciona errores ENOENT en Docker/Coolify

2. ✅ Escáner QR integrado en panel de admin
   - Admin Nivel 1 y 2 pueden escanear desde su panel
   - No necesitan cambiar de interfaz
   - Tab "📷 Escáner QR" en admin.html

3. ✅ Foto del vehículo en validación de QR
   - Al escanear QR se muestra la foto del vehículo
   - Permite verificación visual del vehículo
   - Previene uso fraudulento de QR

4. ✅ Mejor logging y verificación
   - Logs detallados de generación de QR
   - Verificación de existencia de archivos
   - Mensajes de error más descriptivos

**Archivos modificados:**
- `server/server.js` - Creación automática de directorios
- `server/routes/admin.js` - Mejor logging en generación QR
- `server/routes/scanner.js` - Incluye foto en validación
- `public/admin.html` - Tab de escáner QR
- `public/js/admin.js` - Funcionalidad de escáner

---

## Contacto y Soporte

Para dudas o problemas, revisa:
1. Este documento
2. SETUP_DATABASE.md
3. README.md
4. Logs del servidor
