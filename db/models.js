const { Sequelize } = require('sequelize');
const db = require("./db")

const SUrl = db.define('shorturls', { 
    userId: Sequelize.NUMBER,
    shortcode: Sequelize.STRING,
    url: Sequelize.STRING,
    timestamp: Sequelize.DATE
});

const File = db.define('files', { 
    userId: Sequelize.NUMBER,
    type: Sequelize.STRING,
    size: Sequelize.STRING,
    hash: Sequelize.STRING,
    timestamp: Sequelize.DATE
});

const User = db.define('users', { 
    userId: Sequelize.NUMBER,
    email: Sequelize.STRING,
    username: Sequelize.STRING,
    password: Sequelize.STRING,
    token : Sequelize.STRING,
    timestamp: Sequelize.DATE,
    account: {
        enabled: Sequelize.BOOLEAN,
        verified: Sequelize.BOOLEAN,
        administrator: Sequelize.BOOLEAN
    }, 
    emailVerification: {
        code: Sequelize.NUMBER,
        verified: Sequelize.BOOLEAN
    }
});

exports {
    SUrl,
    File,
    User
}