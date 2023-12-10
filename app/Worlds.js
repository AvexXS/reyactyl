const express = require('express');
const axios = require('axios');
const { WebSocket } = require('ws');
const db = require('../handlers/Database');

const multer = require('multer'); // Add multer for handling file uploads

const settings = {
    "ptero": {
        "url": "https://dev.redstone.sh",
        "clientKey": "ptlc_8BOhZYNwZpELgkl3TkRAcnCr2X5wm6KzSMR8k7cZqXS",
        "adminKey": "ptla_lCoK2bSbxe7rbCO3u9fRb0oZGk4Hr05j3thJsYN9YzA"
    }
};

const router = express.Router();
const upload = multer();

async function handleError(res, err) {
    console.error(err);
    res.render('500.ejs', { err });
}

// Worlds
router.get("/server/:id/worlds", async (req, res) => {
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

        let directory = req.query.directory ? decodeURIComponent(req.query.directory) : "/";
        
        const apiResponse = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}/files/list?directory=${encodeURIComponent(directory)}`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        });

        const directories = apiResponse.data.data
            .filter(entry => entry.attributes.is_file === false && entry.attributes.name.includes("world"))
            .map(entry => entry.attributes.name);

        const serverIP = await getServerIP(req.params.id);

        const clientDetails = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        });
        
        res.render("server/worlds", { req, obj: userObject, ptero: user.attributes, srvs: serverDetails, ip: serverIP, files: { directories }, cDir: directory, clientDetails });
    } catch (error) {
        handleError(res, error);
    }
});

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
