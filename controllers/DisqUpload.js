const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { File } = require("../db/models")

const validator = require('validator')
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require("fs");
const utils = require("./DisqUtils")
const randomstring = require("randomstring")

const files = {}

const uploadDir = path.join(__dirname, '..', config.uploads.folder);

const storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function(req, file, cb) {
		const access = i => {
			const name = randomstring.generate(config.uploads.fileLength) + path.extname(file.originalname);
			
			fs.access(path.join(uploadDir, name), err => {
				if (err) return cb(null, name);
				console.log(`A file named "${name}" already exists (${++i}/${maxTries}).`);
				if (i < maxTries) return access(i);
				return cb('Could not allocate a unique file name. Try again?');
			});
		};
		access(0);
	}
});

const upload = multer({
	storage: storage,
	limits: { fileSize: config.uploads.maxSize },
	fileFilter: function(req, file, cb) {
		if (config.blockedExtensions !== undefined) {
			if (config.blockedExtensions.some(extension => path.extname(file.originalname).toLowerCase() === extension)) {
				return cb('This file extension is not allowed');
			}
			return cb(null, true);
		}
		return cb(null, true);
	}
}).array('files[]');

files.create = async (req, res) => {
    let auth = await utils.authorize(req, res)
    upload(req, res, async err => {
		if (err) {
			console.error(err);
			return res.json({ success: false, description: err });
		}

		if (req.files.length === 0) return res.json({ success: false, description: 'no-files' });

		const filesArray = [];
		const existingFiles = [];
		let iteration = 1;

		req.files.forEach(async file => {
			// Check if the file exists by checking hash and size
			let hash = crypto.createHash('md5');
			let stream = fs.createReadStream(path.join(__dirname, '..', config.uploads.folder, file.filename));

			stream.on('data', data => {
				hash.update(data, 'utf8');
			});

			stream.on('end', async () => {
				const fileHash = hash.digest('hex');
				const dbFile = await File.findAll({
					where: {
						hash: fileHash,
						size: file.size.toString(),
						userId: auth.userId
					},
					limit: 1
				})

				if (dbFile.length === 0) {
					filesArray.push({
						name: file.filename,
						original: file.originalname,
						type: file.mimetype,
						size: file.size,
						hash: fileHash,
						userId: auth.userId,
						timestamp: Math.floor(Date.now() / 1000)
					});
				} else {
					files.deleteFile(file.filename).then(() => {}).catch(err => console.error(err));
					existingFiles.push(dbFile[0]);
				}

				if (iteration === req.files.length) {
						// Process for display
						let basedomain = config.domain;

						// Custom domain support for now
						if (req.get('DisqUploadDomain')) {
							basedomain = req.get('DisqUploadDomain');
						}
						
						if (filesArray.length === 0) {
							return res.json({
								success: true,
								files: existingFiles.map(file => {
									return {
										name: file.name,
										size: file.size,
										url: `${basedomain}/${file.name}`
									};
								})
							});
						}

						filesArray.forEach(async f => {
							let newFile = await File.build(f)
							await newFile.save()
						})
						for (let efile of existingFiles) filesArray.push(efile);
						
						// TODO: thumbnail generation later 

						return res.json({
							success: true,
							description: 'Files uploaded!',
							files: filesArray.map(file => {
								return {
									name: file.name,
									size: file.size,
									url: `${basedomain}/${file.name}`
								};
							})
						});
					
				}
				iteration++;
			});
		});
	});
}

files.deleteFile = (file) => {
	console.log("DELETING FILE")
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
    
    let files = await File.findAll({ 
        where: { userId: auth.userId },
        limit: 25,
        order: [
            ['id', 'DESC']
        ],
        offset: 25 * offset
    })
    res.json({ success: true, files })
}

files.delete = async (req, res) => {
}

module.exports = files;