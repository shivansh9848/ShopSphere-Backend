const Brand = require("../models/Brand");
exports.fetchBrands = async (req, res) => {
  try {
    const brands = await Brand.find({}).exec();
    res.status(200).json(brands);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.CreateBrand = async (req, res) => {
  const brand = new Brand(req.body);
  try {
    const response = await brand.save();
    console.log(response);
    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};
