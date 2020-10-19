const msg = require("../config/messages.json")
const { User } = require("../db/models")

const auth = {}
auth.login = async (req, res) => {
    if(!req.body.username) return res.json({ success: false, message: msg.noUsername })
    if(!req.body.password) return res.json({ success: false, message: msg.noPassword })
    let user = await User.findAll({
        limit: 1,
        where: {
            username: req.body.username
        }
    })
}

auth.register = async (req, res) => {
    
}

auth.changePassword = async (req, res) => {
    
}