"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const mw = require("../middleware/api");
const promiseify = require("just-promiseify");
const helpers = require("../helpers/wallet-helpers");

const router = express.Router();

router.use((req, res, next) => {
  if (req.get("Authorization")) {
    let tokenContent = {};
    promiseify(jwt.verify)(req.get("Authorization"), process.env.TOKEN_SECRET).then((result) => {
      tokenContent = result;
      return req.app.locals.db("apikeys").where({
        id: tokenContent.key,
        userId: tokenContent.user,
      });
    }).then((result) => {
      if (result.length <= 0) {
        throw new Error("invalid key");
      }

      return req.app.locals.db("wallets").where({
        userId: tokenContent.user,
      }).limit(1);
    }).then((rows) => {
      req.wallet = rows.length > 0 ? rows[0] : null;
      return next();
    }).catch((e) => {
      if (e === "invalid key") {
        return res.json({
          ok: false,
          error: "Invalid API Key!",
        });
      }

      return res.json({
        ok: false,
        error: "Problem while verifying API key.",
      });
    });
  } else if (req.user) {
    req.app.locals.db("apikeys").where({
      userId: req.user.id,
    }).then((rows) => {
      req.apikey = rows.length > 0 ? rows[0] : null;
      return next();
    }).catch(() => res.json({
      ok: false,
      error: "Problem while fetching user information.",
    }));
  } else {
    next();
  }
});

router.get("/hello", mw.headerRequired(), (req, res) => {
  res.json({
    ok: true,
    hello: "world",
  });
});

// USER API SETTINGS

router.get("/status", mw.authRequired(), (req, res) => {
  if (req.apikey) {
    return res.json({
      ok: true,
      enabled: true,
      key: req.apikey.key,
    });
  }

  res.json({
    ok: true,
    enabled: false,
  });
});

router.get("/enable", mw.authRequired(), (req, res) => {
  if (req.apikey) {
    return res.redirect("/api/status");
  }

  let keyid = -1;
  req.app.locals.db("apikeys").insert({
    userId: req.user.id,
  }).then((updates) => {
    [keyid] = updates;
    return promiseify(jwt.sign)({
      user: req.user.id,
      key: keyid,
    }, process.env.TOKEN_SECRET);
  }).then((token) => req.app.locals.db("apikeys").where({
    userId: req.user.id,
    id: keyid,
  }).update({
    key: token,
  }))
    .then(() => res.redirect("/api/status"))
    .catch(() => res.json({
      ok: false,
      error: "Problem while enabling/generating API key.",
    }));
});

router.get("/disable", mw.authRequired(), (req, res) => {
  if (!req.apikey) {
    return res.redirect("/api/status");
  }

  req.app.locals.db("apikeys").where({
    userId: req.user.id,
  }).del().then(() => res.redirect("/api/status")).catch(() => res.json({
    ok: false,
    error: "Problem while disabling API.",
  }));
});

// WALLET API

// router.get("/info")...
// <- balance, address
router.get("/info", mw.headerRequired(), mw.walletRequired(), (req, res) => {
  req.app.locals.service.getBalance({
    address: req.wallet.walletAddress,
  }).then((balance) => res.json({
    ok: true,
    address: req.wallet.walletAddress,
    balance: balance,
  })).catch((e) => {
    req.app.locals.log.error(e);
    return res.json({
      ok: false,
      error: "Problem fetching balance from node.",
    });
  });
});

// router.post("/send")...
// -> recipient, amount, fee, paymentid, mixin
// <- transaction id
router.post("/send", mw.headerRequired(), mw.walletRequired(), (req, res) => {
  const txRecipient = req.body.recipient;
  let txAmount = req.body.amount;
  let txFee = req.body.fee;
  const txId = req.body.paymentid;
  let txMixin = req.body.mixin;

  if (!(txRecipient && txAmount && txFee && txMixin)) {
    return res.json({
      ok: false,
      error: "You need to supply 'recipient', 'amount', 'fee', 'paymentid' and 'mixin' in the request body.",
    });
  }

  try {
    txAmount = parseFloat(txAmount);
    txFee = parseFloat(txFee);
    txMixin = parseInt(txMixin);
  } catch (e) {
    return res.json({
      ok: false,
      error: "'amount', 'fee' need to be floating point numbers and 'mixin' need to be a integer number.",
    });
  }

  if (!helpers.validAddress(txRecipient)) {
    return res.json({
      ok: false,
      error: "Invalid 'recipient' address.",
    });
  }

  if (txId && (!helpers.validId(txId))) {
    return res.json({
      ok: false,
      error: "Invalid 'paymentid'.",
    });
  }

  let bal = 0;
  req.app.locals.service.getBalance({
    address: req.wallet.walletAddress,
  }).then((balance) => {
    bal = balance.availableBalance;

    if (!helpers.validAmount(txAmount, bal)) {
      res.json({
        ok: false,
        error: `Invalid 'amount' ${txAmount}.`,
      });
      return "skip";
    }

    if (!helpers.validFee(txFee, txAmount, bal)) {
      res.json({
        ok: false,
        error: `Invalid 'fee' ${txFee} or 'amount' ${txAmount}.`,
      });
      return "skip";
    }

    return req.app.locals.service.sendTransaction({
      transfers: [
        req.app.locals.service.newTransfer(txRecipient.trim(), txAmount),
      ],
      fee: txFee,
      addresses: [
        req.wallet.walletAddress,
      ],
      changeAddress: req.wallet.walletAddress,
      mixin: txMixin,
      paymentId: (txId) ? txId.trim() : null,
    });
  }).then((transaction) => {
    if (transaction !== "skip") {
      res.json({
        ok: true,
        hash: transaction.transactionHash,
      });
    }

    return true;
  }).catch((e) => {
    req.app.locals.log.error(e);
    res.json({
      ok: false,
      error: "Problem sending transaction.",
    });
  });
});

// router.get("/transactions")... (LAST 1000 BLOCKS)
// -> (paymentid)
// <- transactions
router.get("/transactions", mw.headerRequired(), mw.walletRequired(), (req, res) => {
  const txoptions = {
    addresses: [
      req.wallet.walletAddress,
    ],
    blockCount: 1000,
  };

  if (req.query.id) {
    if (!helpers.validId(req.query.id)) {
      return res.json({
        ok: false,
        error: "Invalid Payment ID",
      });
    }

    txoptions.paymentId = req.query.id;
  }

  req.app.locals.daemon.getBlockCount().then((count) => {
    let start = count - 1000;
    start = start <= 0 ? 1 : start;
    txoptions.firstBlockIndex = start;
    return req.app.locals.service.getTransactions(txoptions);
  }).then((result) => res.json({
    ok: true,
    targeted: (!!req.query.id),
    transactions: result,
  })).catch((e) => {
    req.app.locals.log.error(e);
    res.json({
      ok: false,
      error: "Problem fetching transactions from node.",
    });
  });
});

module.exports = router;
