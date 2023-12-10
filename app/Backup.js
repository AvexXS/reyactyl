const express = require('express');
const axios = require('axios');
const { WebSocket } = require('ws');
const db = require('../handlers/Database');

const settings = {
    "ptero": {
        "url": "https://panel.halex.gg",
        "clientKey": "ptlc_wAttzVUauSTIBV2k8o7rPAPiHMhrf3nBvXXwcZ8gSlI",
        "adminKey": "ptla_ZvRN3JASV0Txzqh02iNlO7vJrTBnDJDNLQMWQIFXHeV"
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
