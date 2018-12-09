var express = require("express");
var router = express.Router();
var passport = require("passport");
var secured = require("../middleware/secured");

router.get("/login", passport.authenticate("auth0", {
    scope: 'openid email profile'
}), (req, res) => {
    res.redirect("/");
});

router.get("/callback", (req, res, next) => {
    passport.authenticate("auth0", (err, user, info) => {
        if (err) { return next(err); }
        if (!user) { return res.redirect("/login"); }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            const returnTo = req.session.returnTo;
            delete req.session.returnTo;
            res.redirect(returnTo || '/');
        });
    })(req, res, next);
});

router.get("/logout", secured(), (req, res) => {
    req.logout();
    res.redirect("/");
});

module.exports = router;