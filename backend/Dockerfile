FROM node:20

# Instalar netcat (requerido por wait-for-it.sh)
RUN apt-get update && apt-get install -y netcat-openbsd

WORKDIR /app

# Crear carpeta para los certificados SSL
RUN mkdir -p /app/certs

# Copiar archivos de configuración
COPY package*.json ./
RUN npm install --include=dev

# Copiar el resto del código
COPY . .

# Asegurar script wait-for-it.sh esté presente y ejecutable
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

# Generar Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD [ "npm", "run", "start" ]
