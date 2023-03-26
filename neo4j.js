const neo4j = require('neo4j-driver');

let driver


const initDriver = (uri, username, password) => {
  driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

  return driver.verifyConnectivity()
    .then(() => {
        console.log('Connected to Neo4j')
        return driver
    }).catch((err) => {
        console.log('Error connecting to Neo4j', err)
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
