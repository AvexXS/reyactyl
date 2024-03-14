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

// Servers files
router.get("/server/:id/files", async (req, res) => {
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
        const files = [];
        const directories = [];
        
        const apiResponse = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}/files/list?directory=${encodeURIComponent(directory)}`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        });

        for (let i = 0; i < apiResponse.data.data.length; i++) {
            const fileOrDir = apiResponse.data.data[i].attributes;
            
            if (fileOrDir.is_file === false) {
                directories.push(fileOrDir.name);
            } else {
                files.push(fileOrDir.name);
            }
        }

        const serverIP = await getServerIP(req.params.id);

        const clientDetails = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        });
        
        res.render("server/files", { req, obj: userObject, ptero: user.attributes, srvs: serverDetails, ip: serverIP, files: { files, directories }, cDir: directory, clientDetails });
    } catch (error) {
        handleError(res, error);
    }
});

// Edit server files
router.get("/server/:id/files/edit", async (req, res) => {
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

        let directory = req.query.file ? decodeURIComponent(req.query.file) : "/";
        if (serverDetails.length == 0) {
            return res.json({ "status": "error", "error": "Invalid server ID." });
        }

        const apiResponse = await axios.get(`${settings.ptero.url}/api/client/servers/${serverDetails[0].server.attributes.identifier}/files/contents?file=${encodeURIComponent(directory)}`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
        });

        let fileContent = apiResponse.data;

        // Check if the response is in JSON or not
        if (typeof fileContent === 'object') {
            // Convert
            fileContent = JSON.stringify(fileContent);
        }

        res.render("server/edit", { req, obj: userObject, ptero: user.attributes, srvs: serverDetails, fileContent });
    } catch (error) {
        handleError(res, error);
    }
});

router.post("/server/:id/files/edit", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");

        let { server, file, content } = req.body;
        if (!server || !file || !content) throw new Error("Invalid fields!");
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const apiResponse = await axios.post(
            `${settings.ptero.url}/api/client/servers/${server}/files/write?file=${encodeURIComponent(file)}`,
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

router.post("/server/:id/files/create", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");

        let { server, file, content } = req.body;
        if (!server || !file || !content) throw new Error("Invalid fields!");
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const apiResponse = await axios.post(
            `${settings.ptero.url}/api/client/servers/${server}/files/write?file=${encodeURIComponent(file)}`,
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

router.post("/server/:id/files/createDirectory", async (req, res) => {
    try {
        if (!req.session.email) throw new Error("User not logged in");

        let { server, root, name } = req.body;
        if (!root || !name) throw new Error("Invalid fields!");
        
        const userObject = await db.get(`email-${req.session.email}`);
        if (req.session.info.password !== userObject.password) {
            return res.json({ "status": "error", "error": "Session spoofing detected." });
        }

        const apiResponse = await axios.post(
            `${settings.ptero.url}/api/client/servers/${server}/files/create-folder`,
            req.body,
            {
                headers: { 'Authorization': `Bearer ${settings.ptero.clientKey}` }
            }
        );

        res.status(apiResponse.status)
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
