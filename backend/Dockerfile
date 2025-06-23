FROM node:20

RUN apt-get update && apt-get install -y netcat-openbsd

WORKDIR /app

# Certificados
RUN mkdir -p /app/certs

# Dependencias
COPY package*.json ./
RUN npm install --include=dev

# Copiamos el resto
COPY . .

# Permitimos ejecutar wait-for-it
RUN chmod +x ./wait-for-it.sh

# Generar Prisma Client
RUN npx prisma generate

EXPOSE 3001

# Arranque controlado desde docker-compose
CMD ["npm", "run", "start"]
