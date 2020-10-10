const express = require("express");
const disq = express()

disq.listen(2000, () => {
    console.log("Disq API up.")
})