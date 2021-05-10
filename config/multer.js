const fs = require("fs");
const multer = require("multer");
const path = require("path");
const randomstring = require("randomstring")

const config = require("../config/main.json")

let uploadStorage = multer.diskStorage({
    destination: function(req, file, cb) { cb(null, `${config.uploads.folder}`) },
    filename: function(req, file, cb) {
        const fileId = randomstring.generate({
            length: 6,
        }).toString()

        cb(null, fileId + path.extname(file.originalname));
    }
});

let bannerStorage = multer.diskStorage({
    destination: function(req, file, cb) { cb(null, `${config.uploads.folder}/banners`) },
    filename: function(req, file, cb) {
        const bannerHash = randomstring.generate({ length: 10 }).toString()
        cb(null, bannerHash + path.extname(file.originalname));
    }
});

const bannerExt = [ ".png", ".jpg", ".jpeg" ]
const bannerTypes = [ "image/png", "image/jpeg" ]

// 31457280 = 30MiB
// 73400000 = 70MiB

exports.upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 73400000 },
    fileFilter: (req, file, cb) => {
        const fileExt = path.extname(file.originalname).toLowerCase()
        if(config.blockedExtensions.includes(fileExt)){
            return cb(new Error("File extension not allowed"))
        }
        return cb(null, true)
    }
})

exports.banner = multer({
    storage: bannerStorage,
    limits: { fileSize: 31457280 },
    fileFilter: (req, file, cb) => {
        const fileExt = path.extname(file.originalname).toLowerCase()
        if(!bannerExt.includes(fileExt)){
            return cb(new Error("File extension not allowed (pngs and jpgs only please)"))
        }
        if(!bannerTypes.includes(file.mimetype)){
            return cb(new Error("File type not allowed (pngs and jpgs only please)"))
        }
        return cb(null, true)
    }
})