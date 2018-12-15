"use strict";

const express = require("express");
const passport = require("passport");
const Auth0Strategy = require("passport-auth0");
const session = require("express-session");
const moment = require("moment");
const KnexSessionStore = require("connect-session-knex")(session);
const TurtleCoin = require("turtlecoin-rpc");
const signale = require("signale");

const daemon = new TurtleCoin.TurtleCoind({
  host: process.env.DAEMON_HOST,
  port: 10181,
  timeout: 2000,
  ssl: false,
});

const service = new TurtleCoin.TurtleService({
  host: process.env.SERVICE_HOST,
  port: 10191,
  timeout: 2000,
  ssl: false,
  rpcPassword: process.env.SERVICE_PASSWORD,
  defaultMixin: 0,
  defaultFee: 0.1,
  defaultBlockCount: 500,
  decimalDivisor: 100,
  defaultFirstBlockIndex: 1,
  defaultUnlockTime: 0,
  defaultFusionThreshold: 10000000,
});

const app = express();
const knex = require("knex")({
  client: "mysql",
  connection: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },
});

passport.use(new Auth0Strategy({
  domain: process.env.AUTH0_DOMAIN,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  callbackURL: process.env.AUTH0_CALLBACK_URL || "http://localhost:3000/callback",
}, (accessToken, refreshToken, extraParams, profile, done) => done(null, profile)));

app.set("trust proxy", (process.env.NODE_ENV === "production"));
app.set("view engine", "ejs");

app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: app.get("env") === "production",
  },
  resave: false,
  saveUninitialized: true,
  store: new KnexSessionStore({
    knex,
  }),
}));
app.use(require("cookie-parser")());
app.use(require("body-parser").json());
app.use(require("body-parser").urlencoded({
  extended: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.authd = (!!req.user);

  res.locals.moment = moment;

  if (req.user) {
    res.locals.user = req.user;
  } else {
    res.locals.user = {};
  }

  signale.debug(`(${(res.locals.authd ? "A" : " ")}) ${req.ip} ==[${req.method}]==> ${req.originalUrl}`);

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

app.get("/settings", (req, res) => {
  res.render("settings");
});

app.use("/", require("./routes/auth"));
app.use("/api", require("./routes/api"));
app.use("/wallet", require("./routes/wallet"));

app.listen(3000, () => {
  signale.start("Listening on port 3000!");

  knex.schema.hasTable("wallets").then((result) => {
    if (!result) {
      return knex.schema.createTable("wallets", (table) => {
        table.increments("id");
        table.string("userId");
        table.string("walletAddress");
      });
    }

    return "skip";
  }).then((r) => {
    if (r !== "skip") {
      signale.complete("'wallets' table created.");
    }

    return true;
  }).catch((e) => {
    signale.error("Error creating 'wallets' table!", e);
    process.exit(1);
  });

  knex.schema.hasTable("apikeys").then((result) => {
    if (!result) {
      return knex.schema.createTable("apikeys", (table) => {
        table.increments("id");
        table.string("userId");
        table.string("key");
      });
    }

    return "skip";
  }).then((r) => {
    if (r !== "skip") {
      signale.complete("'apikeys' table created.");
    }

    return true;
  }).catch((e) => {
    signale.error("Error creating 'apikeys' table!", e);
    process.exit(1);
  });

  app.locals.db = knex;
  app.locals.daemon = daemon;
  app.locals.service = service;
  app.locals.log = signale;
});
