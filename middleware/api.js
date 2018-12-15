"use strict";

module.exports.headerRequired = function headerRequired() {
  return function middleware(req, res, next) {
    if (!req.get("Authorization")) {
      return res.json({
        ok: false,
        error: "You need to supply an Authorization header for this call.",
      });
    }

    return next();
  };
};

module.exports.authRequired = function authRequired() {
  return function middleware(req, res, next) {
    if (!req.user) {
      return res.json({
        ok: false,
        error: "You need to be logged in for this call.",
      });
    }

    return next();
  };
};

module.exports.walletRequired = function walletRequired() {
  return function middleware(req, res, next) {
    if (!req.wallet) {
      return res.json({
        ok: false,
        error: "You need a wallet attached to your account for this call.",
      });
    }

    return next();
  };
};
