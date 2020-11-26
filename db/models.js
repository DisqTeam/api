const { Sequelize } = require('sequelize');
const db = require("./db")

exports.SUrl = db.define('shorturls', { 
    userId: Sequelize.BIGINT,
    shortcode: Sequelize.STRING,
    url: Sequelize.STRING,
    timestamp: Sequelize.DATE
});

exports.File = db.define('files', {
    userId: Sequelize.BIGINT,
    name: Sequelize.STRING,
    original: Sequelize.STRING,
    type: Sequelize.STRING,
    size: Sequelize.STRING,
    hash: Sequelize.STRING,
    timestamp: Sequelize.DATE
});

exports.User = db.define('users', { 
    userId: Sequelize.BIGINT,
    enabled: Sequelize.BOOLEAN,
    pfp: Sequelize.STRING,

    // info
    email: Sequelize.STRING,
    username: Sequelize.STRING,
    password: Sequelize.STRING,

    // sys
    token : Sequelize.STRING,
    timestamp: Sequelize.DATE,

    // privileges
    verified: Sequelize.BOOLEAN,
    administrator: Sequelize.BOOLEAN,

    // email verification
    emailVerifyCode: Sequelize.STRING,
    emailVerified: Sequelize.BOOLEAN
});

// Sync models to db
db.sync()