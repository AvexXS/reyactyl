const express = require("express");
const axios = require("axios");
const md5 = require("md5");
const crypto = require("crypto");
const db = require("../handlers/Database");
const config = require("../settings.json");
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2({
  clientId: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  redirectUri: config.discord.redirectUri,
});

const settings = {
  ptero: {
    url: config.pterodactyl.url,
    clientKey: config.pterodactyl.clientKey,
    adminKey: config.pterodactyl.adminKey,
  },
};

async function handleError(res, err) {
  console.error(err);
  res.status(500).render("500.ejs", { err });
}

const router = express.Router();

// Login (GET)
router.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const url = oauth.generateAuthUrl({
    scope: ["identify", "email"],
    state: state,
  });
  res.redirect(url);
});

// Discord OAuth2 callback
router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const tokenResponse = await oauth.tokenRequest({
      code: code,
      scope: ["identify", "email"],
      grantType: "authorization_code",
    });
    const userResponse = await oauth.getUser(tokenResponse.access_token);
    const email = userResponse.email;
    const username = userResponse.id;

    // Get the list of users from the Pterodactyl API
    const usersResponse = await axios.get(
      `${
        settings.ptero.url
      }/api/application/users?include=servers&filter[email]=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${settings.ptero.adminKey}`,
        },
      }
    );
    const users = usersResponse.data.data;

    // Sort the users list by email
    users.sort((a, b) => a.attributes.email.localeCompare(b.attributes.email));

    // Find the user with the matching email
    const user = users.find((u) => u.attributes.email === email);
    let userObject;

    if (!user) {
      // No account, err
      return res.redirect("/auth?err=NOACCOUNT");
    } else {
      // User already exists, update the session
      userObject = {
        pteroid: user.attributes.id,
        pteroclientid: user.attributes.uuid,
        pterousername: user.attributes.username,
        password: md5(userResponse.id),
        attributes: user.attributes,
      };
      await db.set(`email-${email}`, userObject);

      // No clue why we have 2?
      await db.set(`info-${email}`, userObject);
    }

    req.session.email = email;
    req.session.info = userObject;
    res.redirect("/dashboard");
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
