const { Sequelize } = require('sequelize');
const dbConfig = require("../config/db.json")

const db = new Sequelize("disq", dbConfig.username, dbConfig.password, {
    host: dbConfig.server,
    port: dbConfig.port,
    logging: false,
    maxConcurrentQueries: 100,
    dialect: 'postgres',
    pool: { maxConnections: 5, maxIdleTime: 30},
    language: 'en',
    transactionType: 'IMMEDIATE'
})

db
.authenticate()
.then(() => {
    console.log("DB Connected!")
})
.catch((err) => {
    console.error(`[Database] Error connecting! - ${err}`)
})


module.exports = db;