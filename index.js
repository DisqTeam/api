const express = require("express");
const disq = express()

// Configuration + DB
const config = require("./config/main.json")
const db = require("./db/db")
disq.use(express.json())

disq.get('/auth/login')

disq.listen(config.port, () => {
    console.log("Disq API up.")
})