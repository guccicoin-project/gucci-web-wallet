var express = require("express");
var router = express.Router();

const TurtleCoind = require('turtlecoin-rpc').TurtleCoind;
const TurtleService = require('turtlecoin-rpc').TurtleService;
const Client = require('turtlecoin-rpc').Client;
var secured = require("../middleware/secured");

const daemon = new TurtleCoind({
    host: process.env.DAEMON_HOST, // ip address or hostname of the TurtleCoind host
    port: 10181, // what port is the RPC server running on
    timeout: 2000, // request timeout
    ssl: false // whether we need to connect using SSL/TLS
});

const service = new TurtleService({
    host: process.env.SERVICE_HOST, // ip address or hostname of the turtle-service host
    port: 10191, // what port is turtle-service running on
    timeout: 2000, // request timeout
    ssl: false, // whether we need to connect using SSL/TLS
    rpcPassword: process.env.SERVICE_PASSWORD, // must be set to the password used to run turtle-service
   
    // RPC API default values
    defaultMixin: 0, // the default mixin to use for transactions, the default setting is false which means we don't have a default value
    defaultFee: 0.1, // the default transaction fee for transactions
    defaultBlockCount: 500, // the default number of blocks when blockCount is required
    decimalDivisor: 100, // Currency has many decimal places?
    defaultFirstBlockIndex: 1, // the default first block index we will use when it is required
    defaultUnlockTime: 0, // the default unlockTime for transactions
    defaultFusionThreshold: 10000000, // the default fusionThreshold for fusion transactions
});

router.use(secured(), (req, res, next) => {
  if (!req.user) {
    res.locals.wallet = null;
    next();
  }

  req.app.locals.db("wallets").where({
    userId: req.user.id
  }).limit(1).then((rows) => {
    res.locals.wallet = rows.length > 0 ? rows[0] : null;
    next();
  });
});

function requireWallet() {
  return function (req, res, next) {
    if (res.locals.wallet) { return next(); }
    res.redirect("/wallet/new");
  };
};

router.get("/", requireWallet(), (req, res) => {
  var balance;
  var transactions;
  var txoptions = {
    addresses: [
      res.locals.wallet.walletAddress
    ],
    blockCount: 1000
  }
  service.getBalance({
    address: res.locals.wallet.walletAddress,
  }).then((result) => {
    balance = result;
    return daemon.getBlockCount();
  }).then((count) => {
    var start = count - 1000;
    start = start <= 0 ? 1 : start;
    txoptions["firstBlockIndex"] = start;
    return service.getTransactions(txoptions);
  }).then((result) => {
    transactions = result;
    console.log(result);
    res.render("wallet", {
      balance: balance,
      transactions: transactions.reverse()
    });
  });  
});

router.post("/sendtransaction", requireWallet(), (req, res) => {
  var sendAmount = parseFloat(req.body.sendAmount);
  var sendFee = parseFloat(req.body.sendFee);

  if (!validAddress(req.body.sendRecipient)) {
    res.send("Invalid recipient address");
    return;
  }

  if (!validId(req.body.sendId)) {
    res.send("Invalid payment ID");
    return;
  }

  service.getBalance({
    address: res.locals.wallet.walletAddress,
  }).then((result) => {
    var bal = result.availableBalance;

    if (!validAmount(sendAmount, bal)) {
      res.send("Invalid amount");
      return;
    }

    if (!validFee(sendFee, sendAmount, bal)) {
      res.send("Invalid fee");
      return;
    }

    service.sendTransaction({
      transfers: [
        service.newTransfer(req.body.sendRecipient, sendAmount)
      ],
      fee: sendFee,
      addresses: [
        res.locals.wallet.walletAddress
      ],
      changeAddress: res.locals.wallet.walletAddress,
      mixin: 0
    }).then((result) => {
      res.send(`Transaction: ${JSON.stringify(result)}`);
    });
  });
});

router.get("/export", requireWallet(), (req, res) => {
  var spendKeys = {};
  var viewKey = {}
  service.getViewKey().then((result) => {
    viewKey = result;
    return service.getSpendKeys({
      address: res.locals.wallet.walletAddress
    });
  }).then((result) => {
    spendKeys = result;
    res.render("wallet/export", {
      spendKeys: spendKeys,
      viewKey: viewKey
    });
  });
});

router.get("/new", (req, res) => {
  if (res.locals.wallet) {
    res.render("wallet/exists");
    return;
  }

  var address = "";
  var viewKey = "";
  var spendKey = "";
  service.createAddress({}).then((result) => {
    address = result;
    return service.getViewKey()
  }).then((result) => {
    viewKey = result;
    return service.getSpendKeys({
      address: address
    });
  }).then((result) => {
    spendKey = result;
    return req.app.locals.db("wallets").insert({
      userId: req.user.id,
      walletAddress: address
    });
  }).then(() => {
    res.render("wallet/new", {
      address: address,
      viewKey: viewKey,
      spendKey: spendKey
    });
  }).catch((err) => {
    console.error(err);
    res.render("error");
  });
});

/*router.get("/import", (req, res) => {
  res.render("wallet/import");
});

router.post("/import", (req, res) => {
  if (res.locals.wallet) {
    res.send("You can't import a wallet if you already have one attached to your account.");
    return;
  }

  if (!(req.body.publicKey && req.body.spendKey)) {
    res.send("Please input both the view and the spend keys.");
    return;
  }

  if ((req.body.publicKey.length != 101 && req.body.publicKey.length != 189) || req.body.publicKey.substring(0, 5) != "gucci") {
    res.send("The public key is invalid.");
    return;
  }

  if (!(isHex(req.body.spendKey) && req.body.spendKey.length == 64)) {
    res.send("The spend key is invalid.");
    return;
  }

  service.createAddress({
    secretSpendKey: req.body.spendKey,
    publicSpendKey: req.body.publicKey
  }).then((result) => {
    req.app.locals.db("wallets").insert({
      userId: req.user.id,
      walletAddress: result.address
    }).then(() => {
      res.redirect("/");
    });
  });

  service.
});*/

function isHex(input) {
  var re = /[0-9A-Fa-f]{6}/g;
  return re.test(input);
}

function validAddress(addr) {
  return (addr.length == 101 || addr.length == 189) && addr.substring(0, 5) == "gucci";
}

function validAmount(amt, bal) {
  return amt < bal;
}

function validFee(fee, amt, bal) {
  return (amt + fee) < bal;
}

function validId(id) {
  return id == "" || (id.length == 64 && isHex(id));
}

module.exports = router;