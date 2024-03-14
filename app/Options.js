const express = require('express');
const axios = require('axios');
const db = require('../handlers/Database');

// Settings JSON file
const config = require('../settings.json');

// Configuration settings
const settings = {
    "ptero": {
        "url": config.pterodactyl.url,
        "clientKey": config.pterodactyl.clientKey,
        "adminKey": config.pterodactyl.adminKey
    }
};

const router = express.Router();

async function handleError(res, err) {
    console.error(err);
    res.render('500.ejs', { err });
}

// Options overview
router.get("/server/:id/options", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const user = await db.get('info-' + req.session.email);
        const servers = user.attributes.relationships.servers.data;
        const serverDetails = [];
        
        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            
            if (server.attributes.identifier == req.params.id) {
                const resources = await axios.get(`${settings.ptero.url}/api/client/servers/${server.attributes.identifier}/resources`, {
                    headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
                });
                serverDetails.push({ "server": server, "resources": resources.data.attributes });
            }
        }

        const clientDetails = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        });
        
        res.render("server/options", { req, obj: userObject, ptero: user.attributes, srvs: serverDetails, clientDetails });
    } catch (error) {
        handleError(res, error);
    }
});

router.post("/server/:id/reinstall", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");

        let { server } = req.body;
        if (!server) throw new Error("Invalid fields!");
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const apiResponse = await axios.post(
            `${settings.ptero.url}/api/client/servers/${server}/settings/reinstall`,
            {
                headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
            }
        );

        res.status(apiResponse.status)
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
