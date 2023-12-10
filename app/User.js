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

async function handleError(res, err) {
    console.error(err);
    res.status(500).render('500.ejs', { err });
}

const router = express.Router();

// Login (POST)
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Check fields
    if (!email || !password) return res.json({ "status": "error", "error": "Invalid data passed." });
    if ((await db.get(`email-${email}`)) == null) return res.json({ "status": "error", "error": "User does not exist." });

    // Set user info in db
    const usersResponse = (await axios.get(`${settings.ptero.url}/api/application/users?include=servers&filter[email]=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${settings.ptero.adminKey}` }
    })).data;
    const user = usersResponse.data.filter(account => account.attributes.email == email)[0];
    db.set('info-' + email, user)

    // Get Tazor user and set session
    const userObject = await db.get(`email-${email}`);
    if (userObject.password !== md5(password)) return res.json({ "status": "error", "error": "Invalid Password." });
    req.session.email = email;
    req.session.info = userObject;
    res.redirect("/dashboard");
});

// Register (GET)
router.get("/register", async (req, res) => {
    const email = req.query.email;
    const password = req.query.password;

    // Check fields
    if (!email || !password) return res.json({ "status": "error", "error": "Invalid data passed." });
    if ((await db.get(`email-${email}`)) !== null) return res.json({ "status": "error", "error": "User already exists." });

    // Send request
    try {
        const data = {
            "email": email,
            "first_name": "A hPanel",
            "last_name": "User",
            "username": md5(email)
        };
        const user = (await axios.post(settings.ptero.url + "/api/application/users", data, {
            headers: { 'Authorization': `Bearer ${settings.ptero.adminKey}` }
        })).data;

        // Create user on Tazor
        await db.set(`email-${email}`, { "pteroid": user.attributes.id, "pteroclientid": user.attributes.uuid, "pterousername": md5(email), "password": md5(password) });
        req.session.email = email;
        req.session.info = { "pteroid": user.attributes.id, "pteroclientid": user.attributes.uuid, "pterousername": md5(email), "password": md5(password) };
        res.json({ "status": "success", "cookie": req.sessionID });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;