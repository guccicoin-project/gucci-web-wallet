"use strict";

const express = require("express");
const helpers = require("../helpers/wallet-helpers");

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
  let balance;
  let transactions;
  const txoptions = {
    addresses: [
      res.locals.wallet.walletAddress,
    ],
    blockCount: 1000,
  };
  req.app.locals.service.getBalance({
    address: res.locals.wallet.walletAddress,
  }).then((result) => {
    balance = result;
    return req.app.locals.daemon.getBlockCount();
  }).then((count) => {
    let start = count - 1000;
    start = start <= 0 ? 1 : start;
    txoptions.firstBlockIndex = start;
    return req.app.locals.service.getTransactions(txoptions);
  }).then((result) => {
    transactions = result;
    return res.render("wallet", {
      balance,
      transactions: transactions.reverse(),
    });
  }).catch((e) => {
    req.app.locals.log.error(e);
    res.render("error");
  });
});

router.post("/sendtransaction", requireWallet(), (req, res) => {
  const sendAmount = parseFloat(req.body.sendAmount);
  const sendFee = parseFloat(req.body.sendFee);

  if (!helpers.validAddress(req.body.sendRecipient)) {
    res.send("Invalid recipient address");
    return;
  }

  if (!helpers.validId(req.body.sendId)) {
    res.send("Invalid payment ID");
    return;
  }

  req.app.locals.service.getBalance({
    address: res.locals.wallet.walletAddress,
  }).then((result) => {
    const bal = result.availableBalance;

    if (!helpers.validAmount(sendAmount, bal)) {
      res.send("Invalid amount");
      return;
    }

    if (!helpers.validFee(sendFee, sendAmount, bal)) {
      res.send("Invalid fee");
      return;
    }

    return req.app.locals.service.sendTransaction({
      transfers: [
        req.app.locals.service.newTransfer(req.body.sendRecipient, sendAmount),
      ],
      fee: sendFee,
      addresses: [
        res.locals.wallet.walletAddress,
      ],
      changeAddress: res.locals.wallet.walletAddress,
      mixin: 0,
      paymentId: req.body.sendId,
    });
  }).then((txResult) => res.send(`Transaction: ${JSON.stringify(txResult)}`)).catch((e) => {
    req.app.locals.log.error(e);
    res.render("error");
  });
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
