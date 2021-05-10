const { Sequelize } = require('sequelize');

const db = new Sequelize("disq", process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
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