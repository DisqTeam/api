const fetch = require("node-fetch");
const queryString = require("querystring");

module.exports.handle = async (req, res) => {
  if (!req.body.redirect) return res.status(400).json({ success: false, description: msg.auth.oauth.noRedirect });
  const discordRes = await fetch(`https://discord.com/api/v8/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: queryString.stringify({
      code: req.body.code,
      client_id: process.env.DISCORD_ID,
      client_secret: process.env.DISCORD_SECRET,
      redirect_uri: req.body.redirect,
      scope: "email identify",
      grant_type: "authorization_code",
    }),
  });
  const disc = await discordRes.json();
  if (disc.error) throw disc.error;

  const infoRes = await fetch("https://discord.com/api/v8/users/@me", { headers: { Authorization: `${disc.token_type} ${disc.access_token}` }});
  info = await infoRes.json();
  return {
    id: info.id,
    email: info.email,
    username: `${info.username}#${info.discriminator}`,
    avatar: `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png`,
    verified: info.verified
  };;
}