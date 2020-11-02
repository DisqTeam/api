const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const sendgrid = require('@sendgrid/mail');
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

// Controllers
let DisqAuth = require("./controllers/DisqAuth")
let DisqSURL = require("./controllers/DisqSURL")
let DisqUpload = require("./controllers/DisqUpload")

// Rate limits
let accountLimiter = new rateLimit({ windowMs: 10000, max: 2, message: {success: false, description: "You are being rate limited."} });
let emailLimiter = new rateLimit({ windowMs: 600000, max: 1, message: {success: false, description: "You are being rate limited."}});
disq.use("/auth/login", accountLimiter)
disq.use("/auth/register", accountLimiter)
disq.use("/auth/resendEmail", accountLimiter)

// Endpoints
disq.get('/', (req, res) => res.json({ "success": true }))
disq.post('/auth/login', (req, res) => DisqAuth.login(req, res))
disq.post('/auth/register', (req, res) => DisqAuth.register(req, res))
disq.post('/auth/verifyEmail', (req, res) => DisqAuth.verifyEmail(req, res))
disq.get('/auth/resendEmail', (req, res) => DisqAuth.resendVerification(req, res))

disq.post('/tokens/verify', (req, res) => DisqAuth.checkToken(req, res))

disq.post('/surl/get', (req, res) => DisqSURL.get(req, res))
disq.get('/surl/list/:page', (req, res) => DisqSURL.list(req, res))
disq.post('/surl/create', (req, res) => DisqSURL.create(req, res))
disq.post('/surl/delete', (req, res) => DisqSURL.delete(req, res))

disq.get('/uploads/:page', (req, res, next) => DisqUpload.list(req, res, next));
disq.post('/upload', (req, res, next) => DisqUpload.create(req, res, next));

disq.listen(config.port, () => {
    console.info("Disq API up.")
})