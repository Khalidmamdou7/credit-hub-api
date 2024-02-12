const neo4j = require('neo4j-driver');
const logger = require('./configs/logger');

let driver


const initDriver = (uri, username, password) => {
  driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

  return driver.verifyConnectivity()
    .then(() => {
        logger.info('Connected to Neo4j')
        return driver
    }).catch((err) => {
        logger.error('Error connecting to Neo4j', err)
        // throw err
    })
}

const getDriver = () => {
  return driver
}

const closeDriver = () => {
  return driver && driver.close()
}

module.exports = {
    initDriver,
    getDriver,
    closeDriver,
}
