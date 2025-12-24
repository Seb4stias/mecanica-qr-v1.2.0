# Usar una imagen más ligera de Node.js
FROM node:18-alpine

# Instalar solo las dependencias necesarias del sistema
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev

# Crear directorio de trabajo
WORKDIR /app

# Copiar solo package.json primero (para aprovechar cache de Docker)
COPY package.json ./

# Instalar dependencias de producción solamente
RUN npm ci --only=production && npm cache clean --force

# Copiar el resto del código
COPY . .

# Crear directorios necesarios
RUN mkdir -p public/qr-codes public/uploads

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]