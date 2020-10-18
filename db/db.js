const { Sequelize } = require('sequelize');
const dbConfig = require("../config/db.json")

const db = new Sequelize("disq", dbConfig.username, dbConfig.password, {
    host: dbConfig.server,
    port: dbConfig.port,
    logging: console.log,
    maxConcurrentQueries: 100,
    dialect: 'postgres',
    ssl: 'Amazon RDS',
    pool: { maxConnections: 5, maxIdleTime: 30},
    language: 'en'
})

const dbHandler = {}
dbHandler.connect = async () => {
    try {
        await db.authenticate();
        console.log('[DB] Connected!');
    } catch (error) {
        console.error('[DB] Error connecting! - ', error);
    }
}

dbHandler.connect()


exports = db;