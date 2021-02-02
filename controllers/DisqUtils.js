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

utils.multer.storage = multer.diskStorage({
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

utils.multer.upload = multer({
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

module.exports = utils;