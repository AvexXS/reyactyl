const express = require('express');
const axios = require('axios');
const md5 = require('md5');

const db = require('../handlers/Database');

// Configuration settings
const settings = {
    "ptero": {
        "url": "https://dev.redstone.sh",
        "clientKey": "ptlc_8BOhZYNwZpELgkl3TkRAcnCr2X5wm6KzSMR8k7cZqXS",
        "adminKey": "ptla_lCoK2bSbxe7rbCO3u9fRb0oZGk4Hr05j3thJsYN9YzA"
    }
};

const router = express.Router();

// Dashboard
router.get("/dashboard", async (req, res) => {
    try {
        if (!req.session.email) return res.redirect("/login");

        // Get servers from Panel
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) return res.json({ "status": "error", "error": "Session spoofing detected." });

        // List servers
        const user = await db.get('info-' + req.session.email);
        const servers = user.attributes.relationships.servers.data;
        const serverDetails = [];
        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            const resources = (await axios.get(`${settings.ptero.url}/api/client/servers/${server.attributes.identifier}/resources`, {
                headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
            })).data;
            serverDetails.push({ "server": server, "resources": resources.attributes });
        }

        // Render page
        res.render("dashboard", { req: req, obj: userObject, ptero: user.attributes, srvs: serverDetails });
    } catch (error) {
        console.log(error)
        res.send(error);
    }
});

module.exports = router;