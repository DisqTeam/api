const { Op } = require("sequelize")
const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { File } = require("../db/models")

const validator = require('validator')
const hasha = require('hasha');
const path = require('path');
const multer = require('multer');
const fs = require("fs");
const dayjs = require("dayjs");
const utils = require("./DisqUtils")
const randomstring = require("randomstring")

const files = {}

const uploadDir = path.join(__dirname, '..', config.uploads.folder);

files.create = async (req, res) => {
    let auth;

    if(req.params.service && req.params.service === "nx"){
        auth = await utils.authorize(req, res, req.params.token)
    } else {
        auth = await utils.authorize(req, res)
    }

	if(!req.file) {
        return res.status(400).json({ success: false, description: msg.files.nofile})
    }

    if(!auth.token) {
        files.deleteFile(req.file.filename)
        return;
    }

    if(req.file.size > 31457280 && !auth.plusActive){
        files.deleteFile(req.file.filename)
        return res.status(400).json({ success: false, description: "File is over 30MB. Upgrade to Plus to upload up to 70MB"})
    }
    
    let base;
    if(!req.headers.url) base = "https://disq.me"
    else base = req.headers.url

    const hash = await hasha.fromFile(config.uploads.folder + path.sep + req.file.filename, {algorithm: 'md5'})
    const timestamp = dayjs().unix();

    let doesExist = await File.findOne({where: { hash: hash, userId: auth.userId }})
    if(doesExist) {
        files.deleteFile(req.file.filename)
        const oldFile = doesExist;
        return res.json({success: true, p: true, file: { 
            name: oldFile.name, 
            size: oldFile.size, 
            timestamp: oldFile.timestamp, 
            type: oldFile.type,
            url: `${base}/${oldFile.name}`
        }})
    }

    let newFile = File.build({
        userId: auth.userId,
        name: req.file.filename,
        original: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        hash,
        timestamp
    })
    await newFile.save();

    console.log(`[Files] ${auth.username} (${auth.userId}) uploaded ${newFile.name}`)
    res.json({success: true, file: { name: newFile.name, size: newFile.size, timestamp, type: newFile.type, url: `${base}/${newFile.name}` }})
}

files.deleteFile = (file) => {
	const ext = path.extname(file).toLowerCase();
	return new Promise((resolve, reject) => {
		fs.stat(path.join(config.uploads.folder, file), (err, stats) => {
			if (err) { return reject(err); }
			fs.unlink(path.join(config.uploads.folder, file), err => {
				if (err) { return reject(err); }
				return resolve();
			});
		});
	});
};

files.list = async (req, res) => {
    let auth = await utils.authorize(req, res)

    let offset = req.params.page;
    if (offset === undefined) offset = 0;
    if(offset < 0) return res.status(400).json({success: false, description: msg.files.invalidPage})

    let options = { 
        where: { userId: auth.userId },
        limit: 25,
        attributes: ['name', 'size', 'timestamp', 'type'],
        offset: 25 * offset
    }

    if(req.query.order){
        if(req.query.order != "name" && req.query.order != "timestamp" && req.query.order != "size") return res.status(400).json({success: false, description: msg.error.genericError})
        if(req.query.order_direction != "DESC" && req.query.order_direction != "ASC") return res.status(400).json({success: false, description: msg.error.genericError})
    
        options.order = [
                [req.query.order, req.query.order_direction]
        ]
    }

    let allFiles = await File.count({ where: {userId: auth.userId}})

    if(req.query.filter){
        let filterQuery = {
            userId: auth.userId,
            name: {
                [Op.like]: '%' + req.query.filter + '%'
            }
        }
        options.where = filterQuery
        allFiles = await File.count({ where: filterQuery })
    }

    let pageCount = Math.floor(allFiles / 25)
    let files = await File.findAll(options)
    res.json({ success: true, files, pages: pageCount })
}

files.delete = async (req, res) => {
    let auth = await utils.authorize(req, res)

    if(!req.body.filename) return res.status(400).json({ success: false, description: msg.files.nofilename })

    let toDelete = await File.findOne({where: {name: req.body.filename}})
    if(!toDelete || !toDelete.userId) return res.status(400).json({ success: false, description: msg.files.notFound })
    if(toDelete.userId != auth.userId) return res.status(401).json({ success: false, description: msg.files.noPermissionDelete })

    files.deleteFile(toDelete.name)
    await toDelete.destroy()

    console.log(`[Files] ${auth.username} (${auth.userId}) deleted ${req.body.filename}`)
    res.json({ success: true })
}

module.exports = files;