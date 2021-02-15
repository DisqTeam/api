const multer = require("multer")
const randomstring = require("randomstring")
const path = require("path")

const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { User } = require("../db/models")

const utils = {}
utils.multer = {}

utils.authorize = async (req, res) => {
    const token = req.headers.token;
    if (token === undefined) return res.status(401).json({ success: false, description: msg.auth.noAuth });
    
    const user = await User.findOne({ where: { token: token }})
    if(!user) return res.status(401).json({ success: false, description: msg.auth.invalidToken })
    if(!user.enabled) return res.status(401).json({ success: false, description: msg.auth.accountDisabled, accountDisabled: true })
    return user;
}

utils.multer.storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, config.uploads.folder);
    },
    filename: function(req, file, cb) {
        const fileId = randomstring.generate({
            length: 5,
        }).toString()

        cb(null, fileId + path.extname(file.originalname));
    }
});
module.exports = utils;