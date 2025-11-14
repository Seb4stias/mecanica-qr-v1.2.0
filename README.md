# Sistema de Gestión de Acceso Vehicular - INACAP

Sistema web para gestionar permisos de acceso vehicular con códigos QR.

## Características

- Solicitud de permisos de acceso vehicular
- Sistema de aprobación de dos niveles
- Generación automática de códigos QR y PDFs
- Validación de QR mediante escáner
- Gestión de usuarios y roles
- Auditoría de accesos

## Roles de Usuario

- **Estudiante**: Solicita permisos de acceso
- **Admin Nivel 1**: Aprueba solicitudes (primera revisión)
- **Admin Nivel 2**: Aprueba solicitudes (aprobación final) y gestiona usuarios
- **Scanner**: Valida códigos QR en puntos de acceso

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

1. Conecta tu repositorio de GitHub a Coolify
2. Crea una base de datos MariaDB en Coolify
3. Vincula la base de datos a tu aplicación
4. Configura las variables de entorno en Coolify:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_PORT` (automáticas)
   - `SESSION_SECRET` (genera una cadena aleatoria)
   - `NODE_ENV=production`
   - Variables de email si usas notificaciones
5. Deploy

## Usuario Administrador por Defecto

Al iniciar por primera vez, se crea automáticamente:

- **Email**: admin@inacap.cl
- **Password**: admin123

⚠️ **CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE**

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
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/session` - Verificar sesión

### Solicitudes
- `POST /api/requests` - Crear solicitud
- `GET /api/requests` - Listar mis solicitudes
- `GET /api/requests/:id` - Ver detalle

### Administración
- `GET /api/admin/requests` - Listar todas las solicitudes
- `POST /api/admin/requests/:id/approve` - Aprobar solicitud
- `POST /api/admin/requests/:id/reject` - Rechazar solicitud

### Escáner
- `POST /api/scanner/validate` - Validar código QR
- `GET /api/scanner/history` - Historial de escaneos

### Gestión de Usuarios
- `GET /api/admin/users` - Listar usuarios
- `POST /api/admin/users` - Crear usuario

## Tecnologías

- Node.js + Express
- MariaDB (MySQL)
- bcrypt (encriptación)
- QRCode (generación de QR)
- PDFKit (generación de PDFs)
- Multer (subida de archivos)
