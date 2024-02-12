const winston = require("winston");


const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/info.log" }),
  ],
});

module.exports = logger;