const { Sequelize } = require('sequelize');
const db = require("./db")

exports.SUrl = db.define('shorturls', {
    userId: Sequelize.BIGINT,
    shortcode: Sequelize.STRING,
    url: Sequelize.STRING,
    timestamp: Sequelize.BIGINT,

    legacyUserId: Sequelize.BIGINT
});

exports.File = db.define('files', {
    userId: Sequelize.BIGINT,
    name: Sequelize.STRING,
    original: Sequelize.STRING,
    type: Sequelize.STRING,
    size: Sequelize.STRING,
    hash: Sequelize.STRING,
    timestamp: Sequelize.BIGINT,

    legacyUserId: Sequelize.BIGINT
});

exports.User = db.define('users', { 
    userId: Sequelize.BIGINT,
    enabled: Sequelize.BOOLEAN,

    // info
    discordId: Sequelize.STRING,
    email: Sequelize.STRING,
    username: Sequelize.STRING,
    avatar: Sequelize.STRING,

    // sys
    token : Sequelize.STRING,
    timestamp: Sequelize.BIGINT,

    // privileges
    verified: Sequelize.BOOLEAN,
    administrator: Sequelize.BOOLEAN
});

exports.LegacyUser = db.define('legacy_users', {
    userId: Sequelize.STRING, 
    username: Sequelize.STRING,
    password: Sequelize.STRING,
    enabled: Sequelize.BOOLEAN,
    timestamp: Sequelize.BIGINT,
});

// Sync models to db
db.sync({alter: true})