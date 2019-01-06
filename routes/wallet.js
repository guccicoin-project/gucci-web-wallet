"use strict";

const express = require("express");

const router = express.Router();
const secured = require("../middleware/secured");

router.use(secured(), (req, res, next) => {
  if (!req.user) {
    res.locals.wallet = null;
    next();
  }

  req.app.locals.db("wallets").where({
    userId: req.user.id,
  }).limit(1).then((rows) => {
    res.locals.wallet = rows.length > 0 ? rows[0] : null;
    return next();
  }).catch((e) => {
    req.app.locals.log.error(e);
    res.render("error");
  });
});

function requireWallet() {
  return function rw(req, res, next) {
    if (res.locals.wallet) {
      return next();
    }

    return res.redirect("/wallet/new");
  };
}

router.get("/", requireWallet(), (req, res) => {
  return res.render("wallet");
});

router.get("/settings", requireWallet(), (req, res) => {
  let spendKeys = {};
  let viewKey = {};
  req.app.locals.service.getViewKey().then((result) => {
    viewKey = result;
    return req.app.locals.service.getSpendKeys({
      address: res.locals.wallet.walletAddress,
    });
  }).then((result) => {
    spendKeys = result;
    return res.render("wallet/settings", {
      spendKeys,
      viewKey,
    });
  }).catch((e) => {
    req.app.locals.log.error(e);
    res.render("error");
  });
});

router.get("/new", (req, res) => {
  if (res.locals.wallet) {
    res.render("wallet/exists");
    return;
  }

  let address = "";
  let viewKey = "";
  let spendKey = "";
  req.app.locals.service.createAddress({}).then((result) => {
    address = result;
    return req.app.locals.service.getViewKey();
  }).then((result) => {
    viewKey = result;
    return req.app.locals.service.getSpendKeys({
      address,
    });
  }).then((result) => {
    spendKey = result;
    return req.app.locals.db("wallets").insert({
      userId: req.user.id,
      walletAddress: address,
    });
  })
    .then(() => res.render("wallet/new", {
      address,
      viewKey,
      spendKey,
    }))
    .catch((err) => {
      req.app.locals.log.error(err);
      res.render("error");
    });
});

module.exports = router;
