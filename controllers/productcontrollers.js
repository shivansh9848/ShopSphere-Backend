const Product = require("../models/Product");

exports.CreateProduct = async (req, res) => {
  const product = new Product(req.body);
  try {
    const response = await product.save();
    console.log(response);
    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};

exports.fetchAllProducts = async (req, res) => {
  let condition = {};
  if (!req.query.admin) {
    condition.deleted = { $ne: true };
  }

  let query = Product.find(condition);
  let totalproductsquery = Product.find(condition);
  console.log(req.query.category);
  if (req.query.category) {
    query = query.find({ category: { $in: req.query.category.split(",") } });
    totalproductsquery = totalproductsquery.find({
      category: { $in: req.query.category.split(",") },
    });
  }

  if (req.query.brand) {
    query = query.find({ brand: { $in: req.query.brand.split(",") } });
    totalproductsquery = totalproductsquery.find({
      brand: { $in: req.query.brand.split(",") },
    });
  }

  if (req.query._sort && req.query._order) {
    const sortOrder = req.query._order === "desc" ? -1 : 1;
    query = query.sort({ [req.query._sort]: sortOrder });
    totalproductsquery = totalproductsquery.sort({
      [req.query._sort]: sortOrder,
    });
  }

  const totalProducts = await totalproductsquery.count().exec();
//   console.log({ totalProducts });

  if (req.query._page && req.query._limit) {
    const pageSize = req.query._limit;
    const page = req.query._page;
    query = query.skip(pageSize * (page - 1)).limit(pageSize);
  }

  try {
    const products = await query.exec(); // Execute the query
    res.set("X-Total-Count", totalProducts);
    console.log(products);
    res.status(200).json(products); // Use 200 status code for success
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};

exports.fetchProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    console.log(product);
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    console.log(product);
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};
