const express = require("express");
const { fetchBrands, CreateBrand } = require("../controllers/brandcontrollers");
const router = express.Router();

router.get("/", fetchBrands).post('/',CreateBrand);
exports.router = router;
