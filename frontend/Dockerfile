FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .

EXPOSE 5173

CMD [ "npm", "run", "dev" ]
