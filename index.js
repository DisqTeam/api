const fs = require("fs");
const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const helmet = require("helmet");
const disq = express()
require('better-logging')(console);

// Configuration + DB
const config = require("./config/main.json")
const keys = require("./config/keys.json")
const { upload, banner } = require("./config/multer")
const db = require("./db/db")
disq.use(cors())
disq.use(helmet());
disq.use(require('sanitize').middleware);
disq.set('trust proxy', 1);

// Misc Setup
if (!fs.existsSync(`${config.uploads.folder}/banners`)) fs.mkdirSync(`${config.uploads.folder}/banners`)

disq.use("/banners", express.static(`${config.uploads.folder}/banners`))

// Controllers
let DisqAuth = require("./controllers/DisqAuth")
let DisqSURL = require("./controllers/DisqSURL")
let DisqUpload = require("./controllers/DisqUpload")
let DisqLegacy = require("./controllers/DisqLegacy")
let DisqAdmin = require("./controllers/DisqAdmin")
let DisqPlus = require("./controllers/DisqPlus")
let DisqProfile = require("./controllers/DisqProfile")

// Rate limits
let accountLimiter = new rateLimit({ windowMs: 10000, max: 30, message: {success: false, description: "You are being rate limited."} });
disq.use("/auth/login", accountLimiter)


// Raw Endpoints
disq.all('/subscription/webhook', express.raw({ type: '*/*' }), (req, res, next) => DisqPlus.hookHandle(req, res, next));

// JSON Endpoints
disq.use(express.json())
disq.use(express.urlencoded({ extended: true }));

disq.get('/', (req, res) => res.redirect("https://www.youtube.com/watch?v=6ov7LXBJy4g"))
disq.post('/auth/login', (req, res) => DisqAuth.login(req, res))
disq.get('/auth/newToken', (req, res) => DisqAuth.newToken(req, res))

disq.post('/users/me', (req, res) => DisqAuth.checkToken(req, res))
disq.get('/users/list/:page', (req, res, next) => DisqAdmin.listUsers(req, res, next));
disq.post('/users/verify', (req, res, next) => DisqAdmin.verifyUser(req, res, next));
disq.post('/users/disable', (req, res, next) => DisqAdmin.disableUser(req, res, next));

disq.get('/profile/me', (req, res) => DisqProfile.me(req, res))
disq.patch('/profile/edit/', (req, res) => DisqProfile.edit(req, res))
disq.put('/profile/edit/banner', banner.single('file'), (req, res) => DisqProfile.banner(req, res))

disq.get('/profile/:code', (req, res) => DisqProfile.get(req, res))

disq.post('/surl/get', (req, res) => DisqSURL.get(req, res))
disq.get('/surl/list/:page', (req, res) => DisqSURL.list(req, res))
disq.post('/surl/create', (req, res) => DisqSURL.create(req, res))
disq.post('/surl/delete', (req, res) => DisqSURL.delete(req, res))

disq.get('/uploads/list/:page', (req, res, next) => DisqUpload.list(req, res, next));
disq.post('/uploads/delete', (req, res, next) => DisqUpload.delete(req, res, next));
disq.post('/upload', upload.single('file'), (req, res, next) => DisqUpload.create(req, res, next));
disq.post('/upload/:service/:token', upload.single('file'), (req, res, next) => DisqUpload.create(req, res, next));

disq.get('/subscription/session', (req, res, next) => DisqPlus.create(req, res, next));
disq.get('/subscription/manage', (req, res, next) => DisqPlus.manage(req, res, next));

disq.post('/migrate', (req, res, next) => DisqLegacy.auth(req, res, next));
disq.get('/stats', (req, res, next) => DisqAdmin.stats(req, res, next));

// Error Handler
disq.use((err, req, res, next) => {
    if(err.message == "File too large") return res.status(400).json({success: false, description: "File size is too big (30mib and 70mib)"})
    if(err.message == "File extension not allowed" || err.message == "File type not allowed" || err.message == "File extension not allowed (pngs and jpgs only please)")
        return res.status(400).json({success: false, description: err.message})

    console.log(err.stack)
    return res.status(500).json({success: false, description: "A server-side error occured! ｡゜(｀Д´)゜｡"})
})

disq.listen(config.port, () => {
    console.info(`Disq API up on ${config.port}.`)
})