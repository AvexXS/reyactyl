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

async function handleError(res, err) {
    console.error(err);
    res.render('500.ejs', { err });
}

router.ws("/server/:id", async (ws, req) => {
    try {
        if (!req.session.email) return ws.end();
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) return ws.end();

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

        if (serverDetails.length == 0) return ws.end();

        const consoleWs = await connectToConsole(serverDetails[0].server.attributes.identifier);

        consoleWs.onmessage = msg => {
            const data = JSON.parse(msg.data);
            if (data.event == "console output") {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ "event": "console", "data": data.args.join("\n") }));
                }
            }
        };

        ws.on("message", async msg => {
            if (consoleWs.readyState === consoleWs.OPEN) {
                consoleWs.send(JSON.stringify({ "event": "send command", "args": [`${msg}`] }));
            } else {
                console.error('Console WebSocket is not open');
            }
        });
    } catch (error) {
        ws.close();
    }
});

router.get("/server/:id", async (req, res) => {
    try {
        if (!req.session.email) return res.redirect("/login");

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

                const nodeId = server.attributes.node;
                const node = await axios.get(`${settings.ptero.url}/api/application/nodes/${nodeId}`, {
                    headers: { 'Authorization': `Bearer ${settings.ptero.adminKey}` }
                });

                serverDetails.push({ "server": server, "resources": resources.data.attributes, "node": node.data.attributes });
            }
        }

        if (serverDetails.length == 0) return res.json({ "status": "error", "error": "Invalid server ID." });

        const serverIP = await getServerIP(req.params.id);
        res.render("server/console", { req: req, obj: userObject, ptero: user.attributes, srvs: serverDetails, ip: serverIP });
    } catch (error) {
        handleError(res, error);
    }
});

async function connectToConsole(id) {
    try {
        const websocketDetails = (await axios.get(`${settings.ptero.url}/api/client/servers/${id}/websocket`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        })).data.data;

        const ws = new WebSocket(websocketDetails.socket);
        ws.onopen = () => {
            ws.send(JSON.stringify({ "event": "auth", "args": [`${websocketDetails.token}`] }));
        };
        return ws;
    } catch (error) {
        console.error(error);
        return null;
    }
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
