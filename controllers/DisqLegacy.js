const { LegacyUser, SUrl, File } = require("../db/models")
const utils = require("./DisqUtils")
const bcrypt = require("bcryptjs")
const msg = require("../config/messages.json");

let legacy = {}

legacy.auth = async (req, res) => {
    let auth = await utils.authorize(req, res)
    if(!auth.token) return;

    if(!req.body.username) return res.status(400).json({ success: false, description: msg.auth.noUsername })
    if(!req.body.password) return res.status(400).json({ success: false, description: msg.auth.noPassword })

    let user = await LegacyUser.findOne({ where: { username: req.body.username } })
    if(!user) return res.status(400).json({ success: false, description: msg.auth.accountNotExist })

    bcrypt.compare(req.body.password, user.password, async (err, result) => {
        if(err){
            console.error(err)
            return res.status(500).json({ success: false, description: msg.error.genericError })
        }
        if(!result) return res.status(401).json({ success: false, description: msg.auth.incorrectCreds })

        await user.destroy()
        console.log(`[Legacy] Migration started for LegacyUser ${user.userId} by ${auth.username} (${auth.userId})`)
        res.json({ success: true })
        legacy.import(auth.userId, user.userId)
    });
}

legacy.import = async (newId, oldId) => {
    await File.update({ userId: newId }, {
        where: {
          legacyUserId: oldId
        }
    });

    await SUrl.update({ userId: newId }, {
        where: {
          legacyUserId: oldId
        }
    });
}

module.exports = legacy;