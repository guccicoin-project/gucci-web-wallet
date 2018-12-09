const express = require('express');
const passport = require("passport");
const Auth0Strategy = require("passport-auth0");
const session = require("express-session");
const moment = require("moment");

var app = express();
var knex = require('knex')({
    client: "mysql",
    connection: {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    },
    pool: {
        min: 0,
        max: 7
    }
});

passport.use(new Auth0Strategy({
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
}, (accessToken, refreshToken, extraParams, profile, done) => {
    return done(null, profile);
}));

app.set("view engine", "ejs")

app.use(session({
    secret: process.env.SESSION_SECRET,
    cookie: {
        secure: app.get("env") === "production"
    },
    resave: false,
    saveUninitialized: true,
    store: new (require('connect-session-knex')(session))({
        knex: knex
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(require("cookie-parser")());
app.use(require("body-parser").json());
app.use(require("body-parser").urlencoded({
    extended: false
}));
app.use((req, res, next) => {
    res.locals.authd = (req.user ? true : false);

    res.locals.moment = moment;
    
    if (req.user) {
        res.locals.user = req.user;
    } else {
        res.locals.user = {};
    }

    console.log(`(${(res.locals.authd ? "A" : " ")}) ${req.ip} ==[${req.method}]==> ${req.originalUrl}`);

    next();
});

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get("/", (req, res) => {
    res.render("index");
});
app.use("/", require("./routes/auth"));
app.use("/wallet", require("./routes/wallet"));

app.listen(3000, () => {
    console.log("Listening on port 3000!");

    console.log("Creating tables...");
    knex.schema.createTableIfNotExists("wallets", (table) => {
        table.increments("id");
        table.string("userId");
        table.string("walletAddress");
    }).then(() => {
        console.log("'wallets' table created.");
    });

    app.locals.db = knex;
});