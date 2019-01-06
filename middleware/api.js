"use strict";

module.exports.authRequired = function authRequired() {
  return function middleware(req, res, next) {
    if (!req.user && !req.get("Authorization")) {
      return res.json({
        ok: false,
        error: "You need to be logged in or supply an Authorization header for this call.",
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
