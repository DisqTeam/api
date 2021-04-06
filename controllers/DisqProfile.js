const msg = require("../config/messages.json")
const config = require("../config/main.json")
const keys = require("../config/keys.json")
const { Profile, ProfileLink, User } = require("../db/models")

const path = require("path")
const fs = require("fs")
const validator = require('validator')
const utils = require("./DisqUtils")
const randomstring = require("randomstring")
const atob = require("atob")
const btoa = require("btoa")
const { Op } = require("sequelize")

const blacklistedUrls = [
    "disq",
    "edit",
    "etstringy",
    "profile"
]

const profile = {}

profile.get = async (req, res) => {
    if(!req.params.code) return res.status(400).json({success: false, description: "No profilecode provided!"})
    let profile = await Profile.findOne({where: { url: req.params.code }, attributes: ['enabled', 'url', 'bio', 'banner', 'userId'] })
    if(!profile) return res.status(400).send({success: false, description: "This profile does not exist"})
    if(!profile.enabled) return res.status(400).send({success: false, description: "This profile does not exist"})
    
    let links = await ProfileLink.findAll({where: { userId: profile.userId}, attributes: ['url', 'username']})
    let user = await User.findOne({where: { userId: profile.userId }, attributes: ['avatar', 'username', 'administrator', 'verified']})

    res.send({success: true, profile: {...profile.toJSON(), pfp: user.avatar, flags: {verified: user.verified}, username: user.username.split("#")[0], links}})
}

profile.me = async (req, res) => {
    let auth = await utils.authorize(req, res)
    if(!auth.id) return;

    let profile = await Profile.findOne({
        where: { userId: auth.userId },
        attributes: ['enabled', 'url', 'bio', 'banner']
    })
    if(!profile) return res.status(400).send({success: false, description: "Please setup your profile!"})

    let links = await ProfileLink.findAll({where: { userId: auth.userId}, attributes: ['url', 'username']})
    let user = await User.findOne({where: { userId: auth.userId }, attributes: ['avatar']})
    res.send({success: true, profile: {...profile.toJSON(), pfp: auth.avatar, links}})
}


profile.edit = async (req, res) => {
    let auth = await utils.authorize(req, res)

    if(!req.body.enabled) return res.status(400).json({ success: false, description: "You must specify if the profile is to be enabled or not"})

    if(req.body.links.length > 25) res.status(400).json({ success: false, description: "There is a hard cap of 25 links"}) 

    if(!req.body.bio || req.body.bio.length == 0) return res.status(400).json({ success: false, description: "You must specify a bio!"})
    if(req.body.bio.length > 240) return res.status(400).json({ success: false, description: "Bio must be less than 240 characters"})

    if(!req.body.code) return res.status(400).json({ success: false, description: "You must specify a URL code!"})
    if(blacklistedUrls.includes(req.body.code)) return res.status(400).json({ success: false, description: "The URL code you entered is blacklisted."})
    if(req.body.code.length > 20) return res.status(400).json({ success: false, description: "URL code must be 4-20 characters"})
    if(req.body.code.length < 4) return res.status(400).json({ success: false, description: "URL code must be 4-20 characters"})
    
    const codeExists = await Profile.findOne({where: { url: req.body.code, userId: {[Op.not]: auth.userId} } })
    if(codeExists) return res.status(400).json({ success: false, description: "URL code is taken."})

    let profile = await Profile.findOrCreate({
        where: { userId: auth.userId },
        defaults: {
            userId: auth.userId,
            enabled: req.body.enabled,
            url: req.body.code,
            bio: req.body.bio
        }
    })

    profile[0].enabled = req.body.enabled
    profile[0].url = req.body.code
    profile[0].bio = req.body.bio

    await profile[0].save()

    await ProfileLink.destroy({where: {userId: auth.userId}})
    for(let i = 0; i < req.body.links.length; i++){
        const l = req.body.links[i]
        if(!l.username) continue;
        if(!l.url) continue;
        if(!validator.isURL(l.url, {require_valid_protocol: true})) continue; 
        let pl = ProfileLink.build({
            userId: auth.userId,
            username: l.username,
            url: l.url
        })
        await pl.save()
    }

    res.send({success: true})
}

profile.banner = async (req, res) => {
    let auth = await utils.authorize(req, res)

	if(!req.file) return res.status(400).json({ success: false, description: msg.files.nofile})
    if(!auth.token) return files.deleteFile(req.file.filename)

    let pf = await Profile.findOne({ where: { userId: auth.userId } })
    if(!profile) {
        files.deleteFile(req.file.filename)
        return res.status(400).json({ success: false, description: "Please save your profile at least once before uploading a banner."})
    }

    if(pf.banner != "default.png") {
        await profile.deleteFile(pf.banner)
    }

    pf.banner = req.file.filename
    await pf.save()

    console.log(`[Profile] ${auth.username} (${auth.userId}) updated banner to ${req.file.filename}`)
    res.json({ success: true, banner: req.file.filename })
}

profile.deleteFile = (file) => {
	const ext = path.extname(file).toLowerCase();
	return new Promise((resolve, reject) => {
		fs.stat(path.join(__dirname, '..', config.uploads.folder, "banners", file), (err, stats) => {
			if (err) { return reject(err); }
			fs.unlink(path.join(__dirname, '..', config.uploads.folder, "banners", file), err => {
				if (err) { return reject(err); }
				return resolve();
			});
		});
	});
};

module.exports = profile;