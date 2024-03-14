const express = require('express');
const axios = require('axios');
const db = require('../handlers/Database');
const router = express.Router();

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

async function handleError(res, err) {
    console.error(err);
    res.render('500.ejs', { err });
}

router.get("/server/:id/worlds", async (req, res) => {
    try {
        if (!req.session.email) {
            throw new Error("User not logged in");
        }

        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ status: "error", error: "Session spoofing detected." });
        }

        const user = await db.get('info-' + req.session.email);
        const servers = user.attributes.relationships.servers.data;
        const serverDetails = [];

        for (const server of servers) {
            if (server.attributes.identifier === req.params.id) {
                const resources = await axios.get(`${settings.ptero.url}/api/client/servers/${server.attributes.identifier}/resources`, {
                    headers: { Authorization: `Bearer ${settings.ptero.clientKey}` }
                });
                serverDetails.push({ server, resources: resources.data.attributes });
            }
        }

        let directory = req.query.directory ? decodeURIComponent(req.query.directory) : "/";
        const apiResponse = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}/files/list?directory=${encodeURIComponent(directory)}`, {
            headers: { Authorization: `Bearer ${settings.ptero.clientKey}` }
        });

        const directories = apiResponse.data.data
            .filter(entry => entry.attributes.is_file === false && entry.attributes.name.includes("world"))
            .map(entry => entry.attributes.name);

        const serverIP = await getServerIP(req.params.id);
        const clientDetails = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}`, {
            headers: { Authorization: `Bearer ${settings.ptero.clientKey}` }
        });

        res.render("server/worlds", { req, obj: userObject, ptero: user.attributes, srvs: serverDetails, ip: serverIP, files: { directories }, cDir: directory, clientDetails });
    } catch (error) {
        handleError(res, error);
    }
});

async function getServerIP(id) {
    try {
        const allocations = (await axios.get(`${settings.ptero.url}/api/client/servers/${id}/network/allocations`, {
            headers: { Authorization: `Bearer ${settings.ptero.clientKey}` }
        })).data.data;

        for (const allocation of allocations) {
            if (allocation.attributes.is_default) {
                const ip = (allocation.attributes.ip_alias ? allocation.attributes.ip_alias : allocation.attributes.ip) + ":" + allocation.attributes.port;
                return ip;
            }
        }
    } catch (error) {
        console.error(error);
        return error;
    }
}

module.exports = router;