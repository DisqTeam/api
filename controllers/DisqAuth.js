const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { User } = require("../db/models")

const validator = require('validator')
const randomstring = require("randomstring")
const bcrypt = require("bcryptjs")
const sendgrid = require('@sendgrid/mail');

const auth = {}
auth.login = async (req, res) => {
    if(!req.body.username) return res.json({ success: false, message: msg.auth.noUsername })
    if(!req.body.password) return res.json({ success: false, message: msg.auth.noPassword })
    let user = await User.findAll({
        // where: {
        //         username: req.body.username
        // }
    })
    res.send(user)
}

auth.register = async (req, res) => {
    if(!req.body.username) return res.json({ success: false, message: msg.auth.noUsername })
    if(!req.body.password) return res.json({ success: false, message: msg.auth.noPassword })
    if(!req.body.email) return res.json({ success: false, message: msg.auth.noEmail })

    // Length validation
    if (req.body.username.length < config.lengths.username.min || req.body.username.length > config.lengths.username.max) {
		return res.json({ success: false, description: `Username must have ${config.lengths.username.min}-${config.lengths.username.max} characters` });
	}
	if (req.body.password.length < config.lengths.password.min || req.body.password.length > config.lengths.password.max) {
		return res.json({ success: false, description: `Password must have must have ${config.lengths.password.min}-${config.lengths.password.max} characters` });
    }

    // Email validation
    if(!validator.isEmail(req.body.email)) return res.json({ success: false, message: msg.auth.invalidEmail })

    // Check if username already exists
    let existsUsername = await User.findOne({ where: { username: req.body.username } })
    if(existsUsername) return res.json({ success: false, message: msg.auth.usernameTaken })

    // Check if email already exists
    let existsEmail = await User.findOne({ where: { email: req.body.email } })
    if(existsEmail) return res.json({ success: false, message: msg.auth.emailTaken })

    bcrypt.hash(req.body.password, 10, async (err, hash) => {
        if(err) return res.json({ success: false, description: msg.error.hashError });
        
        const userId = randomstring.generate({
            length: 18,
            charset: "numeric"
        }).toString()
        const token = randomstring.generate(64);
        const emailVerifyCode = randomstring.generate(32);
        const timestamp = new Date().getTime()

        // Insert into db pog
        let newUser = User.build({
            userId,
            enabled: true,
            email: req.body.email,
            username: req.body.username,
            password: hash,
            token,
            timestamp,
            verified: false,
            administrator: false,
            emailVerifyCode,
            emailVerified: false
        })

        await newUser.save();

        // Send verification email
        sendgrid
            .send({
                to: req.body.email,
                from: config.email.from,
                templateId: config.email.templates.verification,
                dynamicTemplateData: {
                    username: req.body.username,
                    verifyUrl: `${config.domain}/verifyEmail?t=${emailVerifyCode}`
                }
            })

        return res.json({ success: true, token: token });
    })

}

auth.verifyEmail = async (req, res) => {
    let code = req.body.emailToken
    if(!code) return res.json({ success: false, message: msg.auth.invalidEmailToken })

    let user = await User.findOne({
        where: {
                "emailVerifyCode": code
        }
    })

    if(!user) return res.json({ success: false, message: msg.auth.invalidEmailToken })
    if(user.emailVerifyCode != code) return res.json({ success: false, message: msg.auth.invalidEmailToken })
    
    user.emailVerified = true;
    await user.save()

    res.json({ success: true })

}

auth.changePassword = async (req, res) => {
    
}

module.exports = auth;