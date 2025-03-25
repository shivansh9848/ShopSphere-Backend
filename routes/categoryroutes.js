const express = require("express");
const { fetchCategories, CreateCategory } = require("../controllers/categorycontrollers");
const router = express.Router();

router.get("/", fetchCategories).post('/',CreateCategory);
exports.router = router;
