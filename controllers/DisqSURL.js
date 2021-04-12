const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { SUrl } = require("../db/models")

const validator = require('validator')
const utils = require("./DisqUtils")
const randomstring = require("randomstring")
const atob = require("atob")
const btoa = require("btoa")

const surl = {}

surl.get = async (req, res) => {
    if(!req.body.shortCode) return res.status(400).json({ success: false, description: msg.surl.noShortcode })
    let short = await SUrl.findOne({ 
        where: { shortcode: req.body.shortCode },
        attributes: ['shortcode', 'url']
    })
    if(!short) return res.status(400).json({ success: false, description: msg.surl.notFound })
    res.json({ success: true, short })
}

surl.create = async (req, res) => {
    let auth = await utils.authorize(req, res)

    if(!req.body.url) return res.status(400).json({ success: false, description: msg.surl.noUrl })
    let url = atob(req.body.url)
    let sc = req.body.shortCode.toLowerCase()

    if(!url) return res.status(400).json({ success: false, description: msg.surl.noUrl })
    if(!sc) sc = randomstring.generate(5);

    let isTaken = await SUrl.findOne({ where: { shortcode: sc } })
    if(isTaken) return res.status(401).json({ success: false, description: "That shortcode is taken." })

    if(sc === req.body.shortCode && !auth.plusActive) return res.status(401).json({ success: false, description: msg.surl.noPermissionCustom })
    if(auth.plusActive && !auth.administrator && auth.vanityCreated > 2) return res.status(401).json({ success: false, description: "You already have 3 vanity URLs. Please delete one to make space" })
    
    if(!validator.isURL(url, {
        require_valid_protocol: true
    })) return res.status(400).json({ success: false, description: msg.surl.invalidUrl })

    let newSurl = SUrl.build({
        userId: auth.userId,
        shortcode: sc,
        url: req.body.url,
        vanity: (sc === req.body.shortCode),
        timestamp: new Date().getTime()
    })
    await newSurl.save()

    if(newSurl.vanity) {
        auth.vanityCreated++;
        await auth.save()
    }

    console.log(`[Surl] ${auth.username} (${auth.userId}) created /s/${newSurl.shortcode}`)
    res.json({ success: true, url: `${config.domain}/s/${sc}` })
}

surl.list = async (req, res) => {
    let auth = await utils.authorize(req, res)

    let offset = req.params.page;
    if (offset === undefined) offset = 0;
    if (offset < 0) offset = 0;
    
    let shorts = await SUrl.findAll({ 
        where: { userId: auth.userId },
        limit: 25,
        order: [
            ['id', 'DESC']
        ],
        offset: 25 * offset
    })

    let allShorts = await SUrl.count({ where: {userId: auth.userId}})
    let pageCount = Math.floor(allShorts / 25)

    res.json({ success: true, shorts, pages: pageCount })
}

surl.delete = async (req, res) => {
    let auth = await utils.authorize(req, res)

    if(!req.body.shortCode) return res.status(400).json({ success: false, description: msg.surl.noShortcode })

    let toDelete = await SUrl.findOne({where: {shortcode: req.body.shortCode}})
    if(!toDelete) return res.status(400).json({ success: false, description: msg.surl.notFound })
    if(toDelete.userId != auth.userId) return res.status(401).json({ success: false, description: msg.surl.noPermissionDelete })

    if(toDelete.vanity){
        auth.vanityCreated--;
        await auth.save()
    }

    await SUrl.destroy({
        where: {
            shortcode: req.body.shortCode
        }
    });
    console.log(`[Surl] ${auth.username} (${auth.userId}) deleted ${req.body.shortCode}`)
    res.json({ success: true })
}

module.exports = surl;