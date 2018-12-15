"use strict";

const express = require("express");
const passport = require("passport");
const secured = require("../middleware/secured");

const router = express.Router();

router.get("/login", passport.authenticate("auth0", {
  scope: "openid email profile",
}), (req, res) => {
  res.redirect("/");
});

router.get("/callback", (req, res, next) => {
  passport.authenticate("auth0", (err, user) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect("/login");
    }

    return req.logIn(user, (loginErr) => {
      if (err) {
        return next(loginErr);
      }

      const {returnTo} = req.session;
      delete req.session.returnTo;
      return res.redirect(returnTo || "/");
    });
  })(req, res, next);
});

router.get("/logout", secured(), (req, res) => {
  req.logout();
  res.redirect("/");
});

module.exports = router;
