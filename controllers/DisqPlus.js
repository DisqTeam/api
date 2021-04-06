const msg = require("../config/messages.json")
const config = require("../config/main.json")
const keys = require("../config/keys.json")
const { SUrl } = require("../db/models")

const validator = require('validator')
const utils = require("./DisqUtils")
const randomstring = require("randomstring")
const atob = require("atob")
const btoa = require("btoa")
const stripe = require('stripe')(keys.stripe.key);

const pay = {}

/*
  feel so clean like a money machine
  feel so clean like a money machi-i-ine
  feel so clean like a money machine
  feel so clean like a money machi-i-ine
*/

pay.create = async (req, res) => {
    let auth = await utils.authorize(req, res)
    let customer = await utils.getStripeCustomer(auth)

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: keys.stripe.price,
          quantity: 1,
        }],
        mode: 'subscription',
        customer: customer.id,
        success_url: config.site + '/dashboard/plus?st={CHECKOUT_SESSION_ID}',
        cancel_url: config.site + '/dashboard/plus',
    });

    res.json({ success: true, sess: session.id });
}

module.exports = pay;