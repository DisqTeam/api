const msg = require("../config/messages.json");
const config = require("../config/main.json");
const { User } = require("../db/models");
const utils = require("./DisqUtils");

const fs = require("fs");
const randomstring = require("randomstring");
const fetch = require("node-fetch");
const dayjs = require("dayjs");
const path = require("path");

const Discord = require("./thirdparty/Discord");
const Twitter = require("./thirdparty/Twitter");
const Github = require("./thirdparty/Github");
const { Op } = require("sequelize");

const auth = {};
auth.login = async (req, res) => {
  if(!req.body.provider) return res.status(400).json({ success: false, description: "No auth provider!" });

  let info;

  switch(req.body.provider) {
    case "discord":
      try { info = await Discord.handle(req, res) } 
      catch(err) { return res.status(400).json({ success: false, description: err }) }
      break;
    case "twitter":
      try { info = await Twitter.handle(req, res) } 
      catch(err) { return res.status(400).json({ success: false, description: err }) }
      break;
    case "github":
      try { info = await Github.handle(req, res) } 
      catch(err) { return res.status(400).json({ success: false, description: err }) }
      break;
    default: 
      return res.status(400).json({ success: false, description: "Invalid auth provider" });
  }

  if (!info) return res.status(400).json({ success: false, description: "An error was occured when authenticating you!" });

  if (info.error) return res.status(400).json({ success: false, description: disc.error });
  if (!info.verified) return res.status(400).json({ success: false, description: msg.auth.needVerifyEmail, emailVerify: true});

  const id_str = info.id.toString()
  let exists = await User.findOne({ where: {
    [Op.or]: [
      { discordId: id_str },
      { twitterId: id_str },
      { githubId: id_str },
    ]
  }});

  if (exists) {
    if (!exists.enabled)
      return res
        .status(403)
        .json({ success: false, description: msg.auth.accountDisabled });

    let avatar;
    if (info.avatar) {
      avatar = await auth.cacheAvatar(info.avatar, exists.userId);
    } else {
      avatar = `${config.domain}/avatars/default.png`;
    }

    if(exists.provider === req.body.provider) {
      exists.email = info.email;
      exists.username = info.username;
      exists.avatar = avatar;
    }

    await exists.save();
    res.json({ success: true, token: exists.token });
  } else {
    const userId = randomstring
      .generate({ length: 18, charset: "numeric" })
      .toString();
    const token = randomstring.generate(64);
    const timestamp = dayjs().unix();

    let avatar;
    if (info.avatar) {
      avatar = await auth.cacheAvatar(info.avatar, userId);
    } else {
      avatar = `${config.domain}/avatars/default.png`;
    }

    let newUser = User.build({
      userId,
      enabled: true,
      
      provider: req.body.provider,

      email: info.email,
      username: info.username,
      avatar,

      token,
      timestamp,

      verified: false,
      administrator: false,
    });

    switch(req.body.provider) {
      case "discord":
        newUser.discordId = id_str
      
      case "twitter":
        newUser.twitterId = id_str

      case "github":
        newUser.githubId = id_str
    }

    await newUser.save();
    res.json({ success: true, token, onboarding: true });
  }
};


auth.cacheAvatar = async (url, hash) => {
  console.log(url);
  try {
    const _pfp = await fetch(url);

    const filePath = path.join(
      `${config.uploads.folder}`,
      "avatars",
      hash + ".png"
    );

    await new Promise((resolve, reject) => {
      const filestream = fs.createWriteStream(filePath, { flags: "w" });
      _pfp.body.pipe(filestream);
      _pfp.body.on("error", () => {
        reject(true);
      });
      filestream.on("finish", () => {
        resolve(true);
      });
    });
    return `${config.domain}/avatars/${hash}.png`;
  } catch (err) {
    console.log(err);
    return `${config.domain}/avatars/default.png`;
  }
};

auth.checkToken = async (req, res) => {
  const token = req.headers.token;
  if (token === undefined)
    return res
      .status(401)
      .json({ success: false, description: msg.auth.noAuth });

  const user = await User.findOne({ where: { token: token } });
  if (!user)
    return res
      .status(401)
      .json({ success: false, description: msg.auth.invalidToken });
  if (!user.enabled)
    return res
      .status(401)
      .json({
        success: false,
        description: msg.auth.accountDisabled,
        accountDisabled: true,
      });
  res.json({
    success: true,
    user: {
      id: user.userId,
      username: user.username,
      avatar: user.avatar,
      privileges: {
        administrator: user.administrator,
        verified: user.verified,
      },
      plus: {
        active: user.plusActive,
        stripeId: user.stripeId,
        expires: user.plusExpires,
      },
      authProvider: user.provider
    },
  });
};

auth.newToken = async (req, res) => {
  let auth = await utils.authorize(req, res);

  const newToken = randomstring.generate(64);
  auth.token = newToken;
  await auth.save();

  res.json({
    success: true,
    token: newToken,
  });
};

module.exports = auth;
