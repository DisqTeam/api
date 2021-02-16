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
    let auth = await utils.authorize(req, res)
    if(!auth.token) {
        files.deleteFile(req.file.filename)
        return;
    }

	if(!req.file) {
        files.deleteFile(req.file.filename)
        return res.status(400).json({ success: false, description: msg.files.nofile})
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
		fs.stat(path.join(__dirname, '..', config.uploads.folder, file), (err, stats) => {
			if (err) { return reject(err); }
			fs.unlink(path.join(__dirname, '..', config.uploads.folder, file), err => {
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
    
    let files = await File.findAll({ 
        where: { userId: auth.userId },
        limit: 25,
        order: [
            ['timestamp', 'DESC']
        ],
        attributes: ['name', 'size', 'timestamp', 'type'],
        offset: 25 * offset
    })
    res.json({ success: true, files })
}

files.delete = async (req, res) => {
    let auth = await utils.authorize(req, res)

    if(!req.body.filename) return res.status(400).json({ success: false, description: msg.files.nofilename })

    let toDelete = await File.findOne({where: {name: req.body.filename}})
    if(!toDelete.userId) return res.status(400).json({ success: false, description: msg.files.notFound })
    if(toDelete.userId != auth.userId) return res.status(401).json({ success: false, description: msg.files.noPermissionDelete })

    files.deleteFile(toDelete.name)
    await toDelete.destroy()

    console.log(`[Files] ${auth.username} (${auth.userId}) deleted ${req.body.filename}`)
    res.json({ success: true })
}

module.exports = files;