const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const multer = require("multer")
const path = require("path")
const sendgrid = require('@sendgrid/mail');
const utils = require("./controllers/DisqUtils")
const disq = express()
require('better-logging')(console);

// Configuration + DB
const config = require("./config/main.json")
const keys = require("./config/keys.json")
const db = require("./db/db")
disq.use(cors())
disq.use(express.json())
disq.use(require('sanitize').middleware)
disq.set('trust proxy', 1);
sendgrid.setApiKey(keys.sendgrid);

const upload = multer({
    storage: utils.multer.storage,
    limits: { fileSize: 31457280 },
    fileFilter: (req, file, cb) => {
        const fileExt = path.extname(file.originalname).toLowerCase()
        if(config.blockedExtensions.includes(fileExt)){
            return cb(new Error("File extension not allowed"))
        }
        return cb(null, true)
    }
})

// Controllers
let DisqAuth = require("./controllers/DisqAuth")
let DisqSURL = require("./controllers/DisqSURL")
let DisqUpload = require("./controllers/DisqUpload")
let DisqLegacy = require("./controllers/DisqLegacy")
let DisqAdmin = require("./controllers/DisqAdmin")

// Rate limits
let accountLimiter = new rateLimit({ windowMs: 10000, max: 30, message: {success: false, description: "You are being rate limited."} });
let emailLimiter = new rateLimit({ windowMs: 600000, max: 1, message: {success: false, description: "You are being rate limited."}});
disq.use("/auth/login", accountLimiter)
disq.use("/auth/register", accountLimiter)
disq.use("/auth/resendEmail", accountLimiter)

// Endpoints
disq.get('/', (req, res) => res.redirect("https://www.youtube.com/watch?v=6ov7LXBJy4g"))
disq.post('/auth/login', (req, res) => DisqAuth.login(req, res))
disq.get('/auth/newToken', (req, res) => DisqAuth.newToken(req, res))
// disq.post('/auth/register', (req, res) => DisqAuth.register(req, res))
// disq.post('/auth/verifyEmail', (req, res) => DisqAuth.verifyEmail(req, res))
// disq.get('/auth/resendEmail', (req, res) => DisqAuth.resendVerification(req, res))

disq.post('/users/me', (req, res) => DisqAuth.checkToken(req, res))
disq.get('/users/list/:page', (req, res, next) => DisqAdmin.listUsers(req, res, next));
disq.post('/users/verify', (req, res, next) => DisqAdmin.verifyUser(req, res, next));
disq.post('/users/disable', (req, res, next) => DisqAdmin.disableUser(req, res, next));

disq.post('/surl/get', (req, res) => DisqSURL.get(req, res))
disq.get('/surl/list/:page', (req, res) => DisqSURL.list(req, res))
disq.post('/surl/create', (req, res) => DisqSURL.create(req, res))
disq.post('/surl/delete', (req, res) => DisqSURL.delete(req, res))

disq.get('/uploads/list/:page', (req, res, next) => DisqUpload.list(req, res, next));
disq.post('/uploads/delete', (req, res, next) => DisqUpload.delete(req, res, next));
disq.post('/upload', upload.single('file'), (req, res, next) => DisqUpload.create(req, res, next));

disq.post('/migrate', (req, res, next) => DisqLegacy.auth(req, res, next));
disq.get('/stats', (req, res, next) => DisqAdmin.stats(req, res, next));

// Error Handler
disq.use((err, req, res, next) => {
    if(err.message == "File too large") return res.status(400).json({success: false, description: "File size is over 30MB"})
    if(err.message == "File extension not allowed" || err.message == "File type not allowed")
        return res.status(400).json({success: false, description: err.message})

    console.log(err.stack)
    return res.status(500).json({success: false, description: "A server-side error occured! ｡゜(｀Д´)゜｡"})
})

disq.listen(config.port, () => {
    console.info("Disq API up.")
})