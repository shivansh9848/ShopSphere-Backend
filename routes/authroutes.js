const express = require("express");
const passport = require("passport");
const { CreateUser, loginUser,checkAuth, resetPasswordRequest, resetPassword, logout  } = require("../controllers/authcontrollers");
const router = express.Router();

router.post('/signup', CreateUser)
.post('/login', passport.authenticate('local'), loginUser)
.get('/check',passport.authenticate('jwt'), checkAuth )
.post('/reset-password-request', resetPasswordRequest)
.post('/reset-password', resetPassword)
.get('/logout', logout);

exports.router = router;
