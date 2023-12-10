const express = require('express');
const axios = require('axios');
const md5 = require('md5');

const db = require('../handlers/Database');

// Configuration settings
const settings = {
    "ptero": {
        "url": "https://panel.halex.gg",
        "clientKey": "ptlc_wAttzVUauSTIBV2k8o7rPAPiHMhrf3nBvXXwcZ8gSlI",
        "adminKey": "ptla_ZvRN3JASV0Txzqh02iNlO7vJrTBnDJDNLQMWQIFXHeV"
    }
};

const router = express.Router();

// Redirect /admin to /admin/overview
router.get("/admin", async (req, res) => {
    try {
        if (!req.session.email) return res.redirect("/login");
        res.redirect('/admin/overview')
    } catch (error) {
        res.send(error);
    }
});

// Nodes
router.get("/admin/nodes", async (req, res) => {
    try {
        if (!req.session.email) return res.redirect("/login");

        const userObject = await db.get(`email-${req.session.email}`);
        const user = await db.get('info-' + req.session.email);

        if (user.attributes.root_admin !== true) return res.render('401');

        const nodes = [];
        
        const apiResponse = await axios.get(`${settings.ptero.url}/api/application/nodes`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.adminKey}` }
        });

        for (let i = 0; i < apiResponse.data.data.length; i++) {
            const node = apiResponse.data.data[i].attributes;
            nodes.push(node)
        }

        // Render page
        res.render("admin/nodes", { req: req, obj: userObject, ptero: user.attributes, nodes });
    } catch (error) {
        res.send(error);
    }
});

// Servers
router.get("/admin/servers", async (req, res) => {
    try {
        if (!req.session.email) return res.redirect("/login");

        const userObject = await db.get(`email-${req.session.email}`);
        const user = await db.get('info-' + req.session.email);

        if (user.attributes.root_admin !== true) return res.render('401');

        const servers = [];
        
        const apiResponse = await axios.get(`${settings.ptero.url}/api/application/servers`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.adminKey}` }
        });

        for (let i = 0; i < apiResponse.data.data.length; i++) {
            const server = apiResponse.data.data[i].attributes;
            servers.push(server)
        }

        // Render page
        res.render("admin/servers", { req: req, obj: userObject, ptero: user.attributes, servers });
    } catch (error) {
        res.send(error);
    }
});

// Users
router.get("/admin/users", async (req, res) => {
    try {
        if (!req.session.email) return res.redirect("/login");

        const userObject = await db.get(`email-${req.session.email}`);
        const user = await db.get('info-' + req.session.email);

        if (user.attributes.root_admin !== true) return res.render('401');

        const users = [];
        
        const apiResponse = await axios.get(`${settings.ptero.url}/api/application/users`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.adminKey}` }
        });

        for (let i = 0; i < apiResponse.data.data.length; i++) {
            const user = apiResponse.data.data[i].attributes;
            users.push(user)
        }

        // Render page
        res.render("admin/users", { req: req, obj: userObject, ptero: user.attributes, users });
    } catch (error) {
        res.send(error);
    }
});

// Overview
router.get("/admin/overview", async (req, res) => {
    try {
        if (!req.session.email) return res.redirect("/login");

        const userObject = await db.get(`email-${req.session.email}`);
        const usersResponse = (await axios.get(`${settings.ptero.url}/api/application/users?include=servers&filter[email]=${encodeURIComponent(req.session.email)}`, {
            headers: { 'Authorization': `Bearer ${settings.ptero.adminKey}` }
        })).data;
        const user = usersResponse.data.filter(account => account.attributes.email == req.session.email)[0];

        if (user.attributes.root_admin !== true) return res.render('401');

        // Render page
        res.render("admin/overview", { req: req, obj: userObject, ptero: user.attributes });
    } catch (error) {
        res.send(error);
    }
});

module.exports = router;