const queryString = require("querystring");
const twitter = require('twitter-lite');

const config = require("../../config/main.json");
const t = new twitter({
  consumer_key: process.env.TWITTER_KEY,
  consumer_secret: process.env.TWITTER_SECRET
});

module.exports.getUrl = async (req, res) => {
  t.getRequestToken(`${config.site}/auth/twitter`)
    .then(parsed => {
        if(!parsed.oauth_callback_confirmed) return res.status(500).json({success: false, description: "Error getting Twitter authentication parts!"})
        res.json({
          success: true,
          secret: parsed.oauth_token_secret,
          token: parsed.oauth_token
        })
    })
    .catch(err => {
      return res.status(500).json({success: false, description: "Error getting Twitter authentication parts!"})
    })
}

module.exports.handle = async (req, res) => {
  try {
    const creds = await t.getAccessToken({
      oauth_verifier: req.body.verifier,
      oauth_token: req.body.code
    })
  
    const t_user = new twitter({
      consumer_key: process.env.TWITTER_KEY,
      consumer_secret: process.env.TWITTER_SECRET,
      access_token_key: creds.oauth_token,
      access_token_secret: creds.oauth_token_secret
    });
  
    const parsed = await t_user.get("account/verify_credentials", { "include_email": true, "skip_status": true })
  
    return {
      id: parsed.id_str,
      email: parsed.email,
      username: parsed.screen_name,
      avatar: parsed.profile_image_url_https,
      verified: true // email verification NOT account verification
    };
  } catch(err) {
    console.log(err)
  }
}