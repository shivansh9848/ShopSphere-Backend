const Category= require("../models/Category");
exports.fetchCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).exec();
    res.status(200).json(categories);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.CreateCategory = async (req, res) => {
  const category = new Category(req.body);
  try {
    const response = await category.save();
    console.log(response);
    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};
