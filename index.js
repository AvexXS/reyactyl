const express = require('express');
const app = express();
const session = require('express-session');
const axios = require('axios');
const expressWs = require('express-ws')(app);
const fs = require('fs')

// Configuration settings
const settings = {
    "ptero": {
        "url": "https://dev.redstone.sh",
        "clientKey": "ptlc_8BOhZYNwZpELgkl3TkRAcnCr2X5wm6KzSMR8k7cZqXS",
        "adminKey": "ptla_lCoK2bSbxe7rbCO3u9fRb0oZGk4Hr05j3thJsYN9YzA"
    }
};

// Express shit
app.set("view engine", "ejs");
app.set('trust proxy', 1); // trust first proxy
app.use(express.urlencoded());
app.use(session({
    secret: '-.-- --- ..- / .- .-. . / --. .- -.-- / .- -. -.. / .... .- ...- . / .- / ... -- .- .-.. .-.. / .--. . -. .. ...',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use("/app-assets", express.static('app-assets'));

app.listen(9000, async () => {
    console.log("Webserver started on port 9000");
    try {
        await axios.get(settings.ptero.url + "/auth/login", { timeout: 2000 });
        console.log("Connected to Panel");
    } catch (error) {
        console.log("Failed to connect to Panel!");
        process.exit();
    }
});

// error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.render('500', { err })
});

// index
app.get("/", async (req, res) => {
    if (req.session.email) return res.redirect("/dashboard");
    res.redirect('/login');
});

// Require the routes
let allRoutes = fs.readdirSync("./app");
for(let i = 0; i < allRoutes.length; i++) {
  let route = require(`./app/${allRoutes[i]}`);
  expressWs.applyTo(route)
  app.use("/", route);
}

app.get("*", async (req, res) => {
    res.render('404')
});
