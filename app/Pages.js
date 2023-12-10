const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Routes from pages.json
function loadRoutes() {
    const pagesFile = path.join(__dirname, '../pages.json');
    const routes = JSON.parse(fs.readFileSync(pagesFile, 'utf-8'));

    const router = express.Router();

    for (const [route, template] of Object.entries(routes)) {
        router.get(route, (req, res) => {
            res.render(template, { req });
        });
    }

    return router;
}

// Use it
router.use(loadRoutes());

module.exports = router;