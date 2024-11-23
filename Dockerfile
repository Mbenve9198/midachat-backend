FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN ls -la src/models/
RUN ls -la src/controllers/

EXPOSE 3000

CMD ["node", "src/server.js"] 