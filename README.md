# Sistema de Gestión de Acceso Vehicular - INACAP

Sistema web para gestionar permisos de acceso vehicular en INACAP, con aprobación de dos niveles administrativos, generación de códigos QR y escaneo de permisos.

## Características

- **Gestión de Solicitudes**: Los estudiantes pueden solicitar permisos de acceso vehicular
- **Aprobación de Dos Niveles**: Sistema de aprobación por Administrador Nivel 1 y Nivel 2
- **Códigos QR**: Generación automática de códigos QR y PDFs al aprobar solicitudes
- **Scanner QR**: Interfaz para escanear y validar códigos QR en tiempo real
- **Notificaciones por Email**: Notificaciones automáticas en cada etapa del proceso
- **Gestión de Usuarios**: Administradores Nivel 2 pueden crear cuentas administrativas
- **Auditoría**: Registro completo de todas las acciones administrativas

## Requisitos

- Node.js 14 o superior
- npm o yarn
- Cuenta de correo SMTP para envío de emails

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd vehicle-access-management
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear un archivo `.env` en la raíz del proyecto:

```env
# Puerto del servidor
PORT=3000

# Base de datos
DB_PATH=./database/vehicle_access.db

# Sesión
SESSION_SECRET=tu-secreto-super-seguro-aqui

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion

# URL de la aplicación
APP_URL=http://localhost:3000

# Entorno
NODE_ENV=development
```

4. Inicializar la base de datos:
```bash
node server/scripts/initDb.js
```

Esto creará:
- La base de datos SQLite
- Todas las tablas necesarias
- Un usuario administrador Nivel 2 inicial:
  - Email: `admin@inacapmail.cl`
  - Contraseña: `Admin123!`

⚠️ **IMPORTANTE**: Cambie esta contraseña después del primer inicio de sesión.

## Ejecución

### Modo Desarrollo
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
.
├── server/
│   ├── config/          # Configuración de base de datos
│   ├── controllers/     # Controladores de rutas
│   ├── middleware/      # Middleware de autenticación y autorización
│   ├── models/          # Modelos de datos
│   ├── routes/          # Definición de rutas
│   ├── services/        # Servicios (email, QR, PDF)
│   ├── scripts/         # Scripts de utilidad
│   └── utils/           # Utilidades y validadores
├── public/              # Archivos estáticos
│   ├── js/             # JavaScript del frontend
│   ├── uploads/        # Archivos subidos
│   ├── qr-codes/       # Códigos QR generados
│   └── styles.css      # Estilos CSS
├── database/            # Base de datos SQLite
└── .env                # Variables de entorno
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/session` - Verificar sesión
- `POST /api/auth/register-student` - Registro de estudiantes

### Solicitudes (Estudiantes)
- `POST /api/requests` - Crear nueva solicitud
- `GET /api/requests/my-requests` - Ver mis solicitudes
- `GET /api/requests/:id` - Ver detalle de solicitud
- `GET /api/requests/:id/qr` - Descargar QR (PDF o PNG)

### Administración
- `GET /api/admin/requests/pending` - Solicitudes pendientes
- `GET /api/admin/requests/approved` - Solicitudes aprobadas
- `GET /api/admin/requests/denied` - Solicitudes denegadas
- `GET /api/admin/requests/:id` - Detalle de solicitud
- `POST /api/admin/requests/:id/approve` - Aprobar solicitud
- `POST /api/admin/requests/:id/deny` - Denegar solicitud

### Scanner
- `POST /api/scanner/scan` - Escanear y validar código QR

### Gestión de Usuarios (Admin Nivel 2)
- `POST /api/admin/users/create` - Crear usuario
- `GET /api/admin/users/pending` - Solicitudes de cuentas pendientes
- `POST /api/admin/users/:id/approve` - Aprobar solicitud de cuenta
- `POST /api/admin/users/:id/reject` - Rechazar solicitud de cuenta
- `GET /api/admin/users/audit` - Historial de auditoría

### Solicitud de Cuentas (Admin Nivel 1)
- `POST /api/admin/users/request` - Solicitar creación de cuenta

## Roles de Usuario

### Estudiante (`student`)
- Crear solicitudes de permiso vehicular
- Ver estado de sus solicitudes
- Descargar códigos QR de solicitudes aprobadas

### Administrador Scanner (`admin_scanner`)
- Escanear códigos QR
- Validar permisos de acceso

### Administrador Nivel 1 (`admin_level1`)
- Ver todas las solicitudes
- Aprobar/denegar solicitudes (requiere aprobación de Nivel 2 también)
- Solicitar creación de cuentas administrativas

### Administrador Nivel 2 (`admin_level2`)
- Todas las funciones de Nivel 1
- Aprobar/denegar solicitudes (aprobación final)
- Crear cuentas administrativas directamente
- Aprobar/rechazar solicitudes de cuentas de Nivel 1
- Ver historial de auditoría completo

## Flujo de Aprobación

1. **Estudiante** crea una solicitud con datos del vehículo y foto
2. Sistema envía notificación por email a **Administradores Nivel 1 y 2**
3. **Administrador Nivel 1** revisa y aprueba/deniega
4. **Administrador Nivel 2** revisa y aprueba/deniega
5. Si **ambos niveles aprueban**:
   - Se genera automáticamente el código QR
   - Se crea un PDF con el permiso
   - Se envía email al estudiante con el PDF adjunto
6. Si **cualquier nivel deniega**:
   - Se envía email al estudiante con el motivo de denegación

## Validaciones

El sistema implementa las siguientes validaciones:

- **Nombre**: Solo letras y espacios
- **RUT**: Formato 12345678-9 o 12345678-K
- **Carrera**: Solo letras y espacios
- **Email**: Debe ser institucional (@inacapmail.cl)
- **Teléfono**: 8 dígitos (se agrega prefijo 9 automáticamente)
- **Foto del vehículo**: Solo imágenes, máximo 5MB

## Seguridad

- Contraseñas hasheadas con bcrypt
- Sesiones seguras con express-session
- Rate limiting en endpoint de login (5 intentos cada 15 minutos)
- Helmet.js para headers de seguridad
- Validación de inputs en backend
- Autorización basada en roles
- HTTPS recomendado en producción

## Configuración de Email

Para Gmail:
1. Habilitar "Verificación en 2 pasos"
2. Generar una "Contraseña de aplicación"
3. Usar esa contraseña en `SMTP_PASS`

Para otros proveedores SMTP, ajustar `SMTP_HOST` y `SMTP_PORT` según corresponda.

## Solución de Problemas

### Error al acceder a la cámara en Scanner
- Verificar permisos del navegador
- Usar HTTPS en producción (requerido para acceso a cámara)

### Emails no se envían
- Verificar configuración SMTP en `.env`
- Revisar logs del servidor para errores específicos
- Verificar que el puerto SMTP no esté bloqueado

### Base de datos bloqueada
- Cerrar todas las conexiones activas
- Reiniciar el servidor
- Si persiste, eliminar el archivo `.db` y reinicializar

## Desarrollo

### Agregar nuevas validaciones
Editar `server/utils/validators.js`

### Modificar plantillas de email
Editar `server/services/emailService.js`

### Cambiar diseño de PDF
Editar `server/services/pdfService.js`

## Licencia

Este proyecto es propiedad de INACAP.

## Soporte

Para soporte técnico, contactar al área de TI de INACAP.
