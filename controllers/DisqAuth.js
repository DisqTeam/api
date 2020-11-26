const msg = require("../config/messages.json")
const config = require("../config/main.json")
const keys = require("../config/keys.json")
const { User } = require("../db/models")
const utils = require("./DisqUtils")

const validator = require('validator')
const randomstring = require("randomstring")
const bcrypt = require("bcryptjs")
const fetch = require("node-fetch")
const sendgrid = require('@sendgrid/mail');

const auth = {}
auth.login = async (req, res) => {
    if(!req.body.username) return res.status(400).json({ success: false, description: msg.auth.noUsername })
    if(!req.body.password) return res.status(400).json({ success: false, description: msg.auth.noPassword })

    let user = await User.findOne({ where: { username: req.body.username } })
    if(!user) return res.status(400).json({ success: false, description: msg.auth.accountNotExist })

    bcrypt.compare(req.body.password, user.password, async (err, result) => {
        if(err){
            console.error(err)
            return res.status(500).json({ success: false, description: msg.error.genericError })
        }
        if(!result && user.administrator) return res.status(401).json({ success: false, description: msg.auth.incorrectCredsAdmin })
        if(!result) return res.status(401).json({ success: false, description: msg.auth.incorrectCreds })

        res.json({ success: true, token: user.token })
    });
}

auth.register = async (req, res) => {
    if(!req.body.username) return res.status(400).json({ success: false, description: msg.auth.noUsername })
    if(!req.body.password) return res.status(400).json({ success: false, description: msg.auth.noPassword })
    if(!req.body.email) return res.status(400).json({ success: false, description: msg.auth.noEmail })

    // Length validation
    if (req.body.username.length < config.lengths.username.min || req.body.username.length > config.lengths.username.max) {
		return res.status(400).json({ success: false, description: `Username must have ${config.lengths.username.min}-${config.lengths.username.max} characters` });
	}
	if (req.body.password.length < config.lengths.password.min || req.body.password.length > config.lengths.password.max) {
		return res.status(400).json({ success: false, description: `Password must have must have ${config.lengths.password.min}-${config.lengths.password.max} characters` });
    }

    // Email validation
    if(!validator.isEmail(req.body.email)) return res.status(400).json({ success: false, description: msg.auth.invalidEmail })

    // Check if username already exists
    let existsUsername = await User.findOne({ where: { username: req.body.username } })
    if(existsUsername) return res.status(400).json({ success: false, description: msg.auth.usernameTaken })

    // Check if email already exists
    let existsEmail = await User.findOne({ where: { email: req.body.email } })
    if(existsEmail) return res.status(400).json({ success: false, description: msg.auth.emailTaken })

    bcrypt.hash(req.body.password, 10, async (err, hash) => {
        if(err) return res.status(500).json({ success: false, description: msg.error.hashError });
        
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
            pfp: "/avatars/default.png",
            email: validator.escape(req.body.email),
            username: validator.escape(req.body.username),
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
    if(!code) return res.status(400).json({ success: false, description: msg.auth.invalidEmailToken })
    if(!req.body.captcha) return res.status(400).json({ success: false, description: msg.auth.noCaptcha })

    let user = await User.findOne({
        where: {
                "emailVerifyCode": code
        }
    })

    if(!user) return res.status(401).json({ success: false, description: msg.auth.invalidEmailToken })
    if(user.emailVerifyCode != code) return res.status(401).json({ success: false, description: msg.auth.invalidEmailToken })
    
    // Recaptcha verification
    fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${keys.recaptcha.private}&response=${req.body.captcha}`, {
        method: "POST"
    })
    .then(res => res.json())
    .then(async rcp => {
        if(!rcp.success) return res.status(401).json({ success: false, description: msg.auth.invalidCaptcha })
            
        user.emailVerified = true;
        await user.save()
    
        res.json({ success: true })
    })
}

auth.changePassword = async (req, res) => {
    
}

auth.checkToken = async (req, res) => {
    const token = req.body.token;
    if (token === undefined) return res.status(401).json({ success: false, description: msg.auth.noAuth });
    
    const user = await User.findOne({ where: { token: token }})
    if(!user) return res.status(401).json({ success: false, description: msg.auth.invalidToken })
    if(!user.enabled) return res.status(401).json({ success: false, description: msg.auth.accountDisabled, accountDisabled: true})
    if(!user.emailVerified) return res.status(401).json({ success: false, description: msg.auth.needVerifyEmail, emailVerify: true, email: user.email })
    res.json({
        success: true,
        user: {
            username: user.username,
            administrator: user.administrator,
            verified: user.verified
        }
    })
}

auth.resendVerification = async (req, res) => {
    // Manual DisqUtils.authorize bc the flow is a little different
    const token = req.headers.token;
    if (token === undefined) return res.status(401).json({ success: false, description: msg.auth.noAuth });
    const user = await User.findOne({ where: { token: token }})
    if(!user) return res.status(401).json({ success: false, description: msg.auth.invalidToken })
    if(!user.enabled) return res.status(401).json({ success: false, description: msg.auth.accountDisabled })

    sendgrid
        .send({
            to: user.email,
            from: config.email.from,
            templateId: config.email.templates.verification,
            dynamicTemplateData: {
                username: user.username,
                verifyUrl: `${config.domain}/verifyEmail?t=${user.emailVerifyCode}`
            }
        })

    res.json({ success: true })
}

module.exports = auth;