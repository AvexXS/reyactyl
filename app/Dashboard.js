const express = require("express");
const axios = require("axios");
const db = require("../handlers/Database");
const config = require("../settings.json");

const settings = {
  ptero: {
    url: config.pterodactyl.url,
    clientKey: config.pterodactyl.clientKey,
    adminKey: config.pterodactyl.adminKey,
  },
};

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  try {
    if (!req.session.email) return res.redirect("/login");

    const userObject = await db.get(`email-${req.session.email}`);
    if (req.session.info.password !== userObject.password) {
      return res.json({ status: "error", error: "Session spoofing detected." });
    }

    const user = await db.get("info-" + req.session.email);
    const servers = user.attributes.relationships.servers.data;
    const serverDetails = [];

    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      try {
        const resources = (
          await axios.get(
            `${settings.ptero.url}/api/client/servers/${server.attributes.identifier}/resources`,
            {
              headers: { Authorization: `Bearer ${settings.ptero.clientKey}` },
            }
          )
        ).data;
        serverDetails.push({ server: server, resources: resources.attributes });
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return res.redirect("/login");
        } else {
          console.error(error);
        }
      }
    }

    res.render("dashboard", {
      req, // Request
      obj: userObject,
      ptero: user.attributes,
      srvs: serverDetails,
    });
  } catch (error) {
    console.error(error);
    res.send(error);
  }
});

module.exports = router;
