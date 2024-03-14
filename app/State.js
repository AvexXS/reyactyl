const express = require('express');
const axios = require('axios');
const { WebSocket } = require('ws');
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

router.post("/server/:id/start", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");

        let { server } = req.body;
        if (!server) throw new Error("Invalid fields!");

        let content = { "signal": "start" };
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const apiResponse = await axios.post(
            `${settings.ptero.url}/api/client/servers/${server}/power`,
            content,
            {
                headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
            }
        );

        res.status(apiResponse.status)
    } catch (error) {
        handleError(res, error);
    }
});

router.post("/server/:id/stop", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");

        let { server } = req.body;
        if (!server) throw new Error("Invalid fields!");

        let content = { "signal": "stop" };
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const apiResponse = await axios.post(
            `${settings.ptero.url}/api/client/servers/${server}/power`,
            content,
            {
                headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
            }
        );

        res.status(apiResponse.status)
    } catch (error) {
        handleError(res, error);
    }
});

router.post("/server/:id/restart", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");

        let { server } = req.body;
        if (!server) throw new Error("Invalid fields!");

        let content = { "signal": "restart" };
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const apiResponse = await axios.post(
            `${settings.ptero.url}/api/client/servers/${server}/power`,
            content,
            {
                headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
            }
        );

        res.status(apiResponse.status)
    } catch (error) {
        handleError(res, error);
    }
});

async function handleError(res, err) {
    console.error(err);
    res.render('500.ejs', { err });
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
