const fetch = require("node-fetch");
const queryString = require("querystring");

module.exports.handle = async (req, res) => {
  if (!req.body.redirect) return res.status(400).json({ success: false, description: msg.auth.oauth.noRedirect });
  const _oauth = await fetch(`https://github.com/login/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: queryString.stringify({
      code: req.body.code,
      client_id: process.env.GITHUB_ID,
      client_secret: process.env.GITHUB_SECRET,
      redirect_uri: req.body.redirect,
    }),
  });
  const oauth = await _oauth.json();
  if (oauth.error) throw oauth.error;

  const infoRes = await fetch("https://api.github.com/user", { headers: { Authorization: `${oauth.token_type} ${oauth.access_token}` }});
  const info = await infoRes.json();
  return {
    id: info.id,
    email: info.email,
    username: info.login,
    avatar: info.avatar_url,
    verified: true
  };;
}