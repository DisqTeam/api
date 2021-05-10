const multer = require("multer")
const randomstring = require("randomstring")
const path = require("path")

const msg = require("../config/messages.json")
const config = require("../config/main.json")
const { User } = require("../db/models")

const stripe = require('stripe')(process.env.STRIPE_KEY);

const utils = {}
utils.multer = {}

utils.authorize = async (req, res, token) => {
    if(!token) token = req.headers.token;
    if (token === undefined) return res.status(401).json({ success: false, description: msg.auth.noAuth });
    
    const user = await User.findOne({ where: { token: token }})
    if(!user) return res.status(401).json({ success: false, description: msg.auth.invalidToken })
    if(!user.enabled) return res.status(401).json({ success: false, description: msg.auth.accountDisabled, accountDisabled: true })
    return user;
}

utils.getStripeCustomer = async (user) => {
    let customer;

    if(!user.stripeId) {
        customer = await stripe.customers.create({ email: user.email });
        user.stripeId = customer.id
        await user.save();
    } else {
        customer = await stripe.customers.retrieve(user.stripeId);
    }

    return customer;
}
module.exports = utils;