const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { User } = require("../db/models")

const utils = {}

utils.authorize = async (req, res) => {
    const token = req.headers.token;
    if (token === undefined) return res.status(401).json({ success: false, description: msg.auth.noAuth });
    
    const user = await User.findOne({ where: { token: token }})
    if(!user) return res.status(401).json({ success: false, description: msg.auth.invalidToken })
    if(!user.enabled) return res.status(401).json({ success: false, description: msg.auth.accountDisabled })
    if(!user.emailVerified) return res.status(401).json({ success: false, description: msg.auth.needVerifyEmail, emailVerify: true })
    return user;
}

module.exports = utils;