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

router.get("/server/:id/network", async (req, res) => {
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

        const ips = [];
        
        const apiResponse = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}/network/allocations`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        });

        for (let i = 0; i < apiResponse.data.data.length; i++) {
            const ip = apiResponse.data.data[i].attributes;
            ips.push(ip)
        }
        
        res.render("server/network", { req, obj: userObject, srvs: serverDetails, ptero: user.attributes, ips });
    } catch (error) {
        handleError(res, error);
    }
});

async function handleError(res, err) {
    console.error(err);
    res.status(500).render('500.ejs', { err });
}

async function getServerIP(id) {
    try {
        const allocations = (await axios.get(`${settings.ptero.url}/api/client/servers/${id}/network/allocations`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        })).data.data;

        for (let i = 0; i < allocations.length; i++) {
            if (allocations[i].attributes.is_default === true) {
                const ip = (allocations[i].attributes.ip_alias ? allocations[i].attributes.ip_alias : allocations[i].attributes.ip) + ":" + allocations[i].attributes.port;
                return ip;
            }
        }
    } catch (error) {
        console.error(error);
        return error;
    }
}

module.exports = router;
