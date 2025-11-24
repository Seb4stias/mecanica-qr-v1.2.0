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



### Inicialización Automática

El sistema realiza automáticamente al iniciar por primera vez:

1. ✅ Crea la base de datos si no existe
2. ✅ Ejecuta el schema SQL (crea todas las tablas)
3. ✅ Crea el usuario administrador por defecto
4. ✅ Inicia el servidor








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
- HTML5 + CSS3 (Responsive Design)
- JavaScript Vanilla
- jsQR (lectura de códigos QR con cámara)
- Fetch API (comunicación con backend)
- Mobile-first design (compatible con móviles, tablets y PC)

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

## Historial de Versiones

### v1.2.3 - Versión Estable (Actual)
- ✅ PDF mejorado con foto del vehículo y modificaciones
- ✅ Diseño responsive (móvil, tablet, PC)
- ✅ Interfaz optimizada para pantallas táctiles
- ✅ Mejoras de accesibilidad

### v1.2.2 - Correcciones QR
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
