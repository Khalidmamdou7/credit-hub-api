# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

RUN npm ci --production --cache .npm --prefer-offline

COPY . .

EXPOSE ${PORT:-3000}

CMD ["node", "server.js"]

