const express = require("express");
const sendgrid = require('@sendgrid/mail');
const disq = express()
require('better-logging')(console);

// Configuration + DB
const config = require("./config/main.json")
const keys = require("./config/keys.json")
const db = require("./db/db")
disq.use(express.json())
disq.use(require('sanitize').middleware)
sendgrid.setApiKey(keys.sendgrid);

// Controllers
let DisqAuth = require("./controllers/DisqAuth")
let DisqSURL = require("./controllers/DisqSURL")

// Endpoints
disq.get('/', (req, res) => res.json({ "success": true }))
disq.post('/auth/login', (req, res) => DisqAuth.login(req, res))
disq.post('/auth/register', (req, res) => DisqAuth.register(req, res))
disq.post('/auth/verifyEmail', (req, res) => DisqAuth.verifyEmail(req, res))
disq.post('/surl/get', (req, res) => DisqSURL.get(req, res))
disq.get('/surl/list', (req, res) => DisqSURL.list(req, res))
disq.post('/surl/create', (req, res) => DisqSURL.create(req, res))
disq.post('/surl/delete', (req, res) => DisqSURL.delete(req, res))

disq.listen(config.port, () => {
    console.info("Disq API up.")
})