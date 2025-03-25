const express = require("express");
const { updateUser, fetchUserById } = require("../controllers/usercontrollers");
const router = express.Router();

router.get("/account", fetchUserById).patch("/:id", updateUser);
exports.router = router;
