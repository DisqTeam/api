const msg = require("../config/messages.json")
const config = require("../config/main.json")
const keys = require("../config/keys.json")
const { SUrl, User } = require("../db/models")

const validator = require('validator')
const crypto = require("crypto")
const utils = require("./DisqUtils")
const randomstring = require("randomstring")
const atob = require("atob")
const btoa = require("btoa")
const dayjs = require("dayjs")
const stripe = require('stripe')(keys.stripe.key);

const pay = {}

pay.create = async (req, res) => {
    let auth = await utils.authorize(req, res)
    let customer = await utils.getStripeCustomer(auth)

    if(auth.plusActive) return res.status(400).json({success: false, description: "You already have a DisqPlus subscription!"})

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: keys.stripe.price,
          quantity: 1,
        }],
        mode: 'subscription',
        allow_promotion_codes: true,
        customer: customer.id,
        success_url: config.site + '/dashboard/plus?st={CHECKOUT_SESSION_ID}',
        cancel_url: config.site + '/dashboard/plus',
    });

    res.json({ success: true, sess: session.id });
}

pay.manage = async (req, res) => {
  let auth = await utils.authorize(req, res)
  let customer = await utils.getStripeCustomer(auth)

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${config.site}/dashboard/plus`,
  });
  res.json({success: true, url: session.url})
}

pay.hookHandle = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, keys.stripe.hook);
  }
  catch (err) {
    console.log(err)
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Plus] Webhook recieved from Stripe (${event.type})`)

  switch(event.type){
      case "customer.subscription.updated":

        let disqUser = await User.findOne({where: {stripeId: event.data.object.customer}})
        switch(event.data.object.status){
          case "active":
            disqUser.plusActive = true;
            disqUser.plusExpires = event.data.object.current_period_end;
            console.log(`[Plus] ${disqUser.username} (${disqUser.userId}) subscription set to ACTIVE`)
            break;

          case "canceled":
            disqUser.plusActive = false;
            disqUser.plusExpires = dayjs().unix()
            console.log(`[Plus] ${disqUser.username} (${disqUser.userId}) subscription set to NONACTIVE`)
            break;

        }
        await disqUser.save()
  }

  res.send("a")
}

module.exports = pay;