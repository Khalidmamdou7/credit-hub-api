# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

RUN npm install

RUN npm install -g nodemon

COPY . .

EXPOSE ${PORT:-3000}
# Start the app with nodemon for hot-reloading
CMD ["nodemon", "--legacy-watch", "--inspect=0.0.0.0:9229", "server.js"]
