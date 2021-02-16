const msg = require("../config/messages.json")
const config = require("../config/main.json")
const keys = require("../config/keys.json")
const { User } = require("../db/models")
const utils = require("./DisqUtils")

const validator = require('validator')
const randomstring = require("randomstring")
const bcrypt = require("bcryptjs")
const fetch = require("node-fetch")
const queryString = require('querystring')
const dayjs = require("dayjs")

const auth = {}
auth.login = async (req, res) => {
    if(!req.body.redirect) return res.status(400).json({ success: false, description: msg.auth.oauth.noRedirect })

    const discordRes = await fetch(`https://discord.com/api/v8/oauth2/token`, {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: queryString.stringify({
            "code": req.body.code,
            "client_id": keys.discord.id,
            "client_secret": keys.discord.secret,
            "redirect_uri": req.body.redirect,
            "scope": "email identify",
            "grant_type": "authorization_code"
        })
    })
    const disc = await discordRes.json()
    if(disc.error) return res.status(400).json({ success: false, description: disc.error })

    const infoRes = await fetch("https://discord.com/api/v8/users/@me", {
        headers: { "Authorization": `${disc.token_type} ${disc.access_token}` }
    })
    const info = await infoRes.json()

    if(info.error) return res.status(400).json({ success: false, description: disc.error })
    if(!info.verified) return res.status(400).json({ success: false, description: msg.auth.needVerifyEmail, emailVerify: true })

    let exists = await User.findOne({ where: { discordId: info.id } })

    if(exists) {
        if(!exists.enabled) return res.status(403).json({ success: false, description: msg.auth.accountDisabled })

        exists.discordId = info.id;
        exists.email = info.email;
        exists.username = `${info.username}#${info.discriminator}`
        exists.avatar = `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}`

        await exists.save()
        res.json({ success: true, token: exists.token })
    } else {
        const userId = randomstring.generate({ length: 18, charset: "numeric" }).toString();
        const token = randomstring.generate(64);
        const timestamp = dayjs().unix();

        let newUser = User.build({
            userId,
            enabled: true,

            discordId: info.id,
            email: info.email,
            username: `${info.username}#${info.discriminator}`,
            avatar: `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}`,

            token,
            timestamp,

            verified: false,
            administrator: false,
        })

        await newUser.save();
        res.json({ success: true, token, onboarding: true })
    }
}

auth.checkToken = async (req, res) => {
    const token = req.headers.token;
    if (token === undefined) return res.status(401).json({ success: false, description: msg.auth.noAuth });
    
    const user = await User.findOne({ where: { token: token }})
    if(!user) return res.status(401).json({ success: false, description: msg.auth.invalidToken })
    if(!user.enabled) return res.status(401).json({ success: false, description: msg.auth.accountDisabled, accountDisabled: true})
    res.json({
        success: true,
        user: {
            username: user.username,
            avatar: user.avatar,
            privileges: {
                administrator: user.administrator,
                verified: user.verified
            }
        }
    })
}

module.exports = auth;