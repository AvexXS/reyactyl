const express = require('express');
const axios = require('axios');
const { WebSocket } = require('ws');
const db = require('../handlers/Database');

const settings = {
    "ptero": {
        "url": "https://dev.redstone.sh",
        "clientKey": "ptlc_8BOhZYNwZpELgkl3TkRAcnCr2X5wm6KzSMR8k7cZqXS",
        "adminKey": "ptla_lCoK2bSbxe7rbCO3u9fRb0oZGk4Hr05j3thJsYN9YzA"
    }
};

const router = express.Router();

// backup ?

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
