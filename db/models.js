const { Sequelize } = require('sequelize');
const db = require("./db")

exports.SUrl = db.define('shorturls', {
    userId: Sequelize.BIGINT,
    shortcode: Sequelize.STRING,
    url: Sequelize.STRING,
    timestamp: Sequelize.BIGINT,
    vanity: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },

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

    // auth
    provider: Sequelize.STRING,
    discordId: Sequelize.STRING,
    twitterId: Sequelize.STRING,
    githubId: Sequelize.STRING,

    // info
    email: Sequelize.STRING,
    username: Sequelize.STRING,
    avatar: Sequelize.STRING,

    token : Sequelize.STRING,
    timestamp: Sequelize.BIGINT,

    // flags
    verified: Sequelize.BOOLEAN,
    administrator: Sequelize.BOOLEAN,

    // plus
    stripeId: Sequelize.STRING,
    plusActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    plusExpires: Sequelize.BIGINT,

    vanityCreated: {
        type: Sequelize.BIGINT,
        defaultValue: 0
    },
});

exports.LegacyUser = db.define('legacy_users', {
    userId: Sequelize.STRING, 
    username: Sequelize.STRING,
    password: Sequelize.STRING,
    enabled: Sequelize.BOOLEAN,
    timestamp: Sequelize.BIGINT,
});

exports.Profile = db.define('profile', {
    userId: Sequelize.BIGINT,
    enabled: Sequelize.BOOLEAN,
    url: Sequelize.STRING,
    bio: Sequelize.STRING,
    banner: {
        type: Sequelize.STRING,
        defaultValue: "default.png"
    }
})

exports.ProfileLink = db.define('profile_links', {
    userId: Sequelize.BIGINT,
    url: Sequelize.STRING,
    username: Sequelize.STRING,
})

// Sync models to db
db.sync({alter: true})