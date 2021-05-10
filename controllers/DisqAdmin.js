const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { User, File, SUrl, Profile } = require("../db/models")

const os = require("os")
const disk = require('diskusage');
const validator = require('validator')
const utils = require("./DisqUtils")
const randomstring = require("randomstring")
const atob = require("atob")
const btoa = require("btoa")

const admin = {}

admin.listUsers = async (req, res) => {
    let auth = await utils.authorize(req, res)
    if(!auth.administrator) return res.status(400).json({ success: false, description: msg.error.permissionError })

    let offset = req.params.page;
    if (offset === undefined) offset = 0;
    
    let options = { 
        limit: 25,
        order: [
            ['id', 'DESC']
        ],
        offset: 25 * offset,
        attributes: {
            exclude: ['token']
        },
        where: {}
    }

    if(req.query.plusOnly) {
        options.where = {
            plusActive: true
        }
    }

    let count = await User.count({ where: options.where})
    count =  Math.floor(count / 25)

    let _users = await User.findAll(options)
    let users = []

    try {
        for(let i = 0; i < _users.length; i++){
            const u = _users[i]
            if(u.userId){
                const linkpage = await Profile.findOne({where: {userId: u.userId}})
                users.push({...u.dataValues, linkpage})
            } else users.push({...u.dataValues})
        }
    } finally {
        res.json({ success: true, users, pages: count })
    }
}

admin.verifyUser = async (req, res) => {
    let auth = await utils.authorize(req, res)
    if(!auth.administrator) return res.status(400).json({ success: false, description: msg.error.permissionError })
    if(!req.body.userId) return res.status(400).json({ success: false, description: "No user to verify" })

    let user = await User.findOne({ 
        where: {
            userId: req.body.userId
        }
    })
    if(!user.userId) return res.status(400).json({ success: false, description: "User dosen't exist" })

    if(user.verified){
        console.log(`[Admin] ${user.username} (${user.userId}) was un-verified by ${auth.username} (${auth.userId})`)
        user.verified = false;
    } else {
        console.log(`[Admin] ${user.username} (${user.userId}) was verified by ${auth.username} (${auth.userId})`)
        user.verified = true;
    }
    await user.save()

    res.json({ success: true })
}

admin.disableUser = async (req, res) => {
    let auth = await utils.authorize(req, res)
    if(!auth.administrator) return res.status(400).json({ success: false, description: msg.error.permissionError })
    if(!req.body.userId) return res.status(400).json({ success: false, description: "No user to disable" })

    let user = await User.findOne({ 
        where: {
            userId: req.body.userId
        }
    })
    if(!user.userId) return res.status(400).json({ success: false, description: "User dosen't exist" })

    if(user.enabled){
        console.log(`[Admin] Account ${user.username} (${user.userId}) was disabled by ${auth.username} (${auth.userId})`)
        user.enabled = false;
    } else {
        console.log(`[Admin] Account ${user.username} (${user.userId}) was re-enabled by ${auth.username} (${auth.userId})`)
        user.enabled = true;
    }
    await user.save()

    res.json({ success: true })
}

admin.stats = async (req, res) => {
    let auth = await utils.authorize(req, res)
    if(!auth.administrator) return res.status(400).json({ success: false, description: msg.error.permissionError })

    let userCount = await User.count()
    let fileCount = await File.count()
    let surlCount = await SUrl.count()
    let storageAvailable;
    let storageTotal;
    
    let path = os.platform() === 'win32' ? 'd:' : '/';

    disk.check(path, function(err, info) {
        if (err) {
          console.log(err);
          storageAvailable = 0;
          storageTotal = 0;
        } else {
          storageAvailable = info.available;
          storageTotal = info.total;
        }
    });

    res.json({ success: true, counts: { userCount, fileCount, surlCount}, storage: { available: storageAvailable, total: storageTotal} })
}

module.exports = admin;