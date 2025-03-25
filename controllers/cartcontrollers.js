const Cart = require("../models/Cart");
exports.fetchCartByUser = async (req, res) => {
    const {id}= req.user
  try {
    const cartItems = await Cart.find({user:id}).populate('product');
    res.status(200).json(cartItems);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.addToCart = async (req, res) => {
  const {id} = req.user
  console.log("addToCart",id)
  const cart = new Cart({...req.body,user:id});
  try {
    const response = await cart.save();
    const result= await response.populate('product')
    console.log(result);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
};

exports.deleteFromCart = async (req, res) => {
    const { id } = req.params;
    try {
      const response = await Cart.findByIdAndDelete(id);
      console.log(response);
      res.status(201).json(response);
    } catch (error) {
      console.error(error);
      res.status(400).json(error);
    }
  };

exports.updateCart = async (req, res) => {
    const { id } = req.params;
    try {
      const cart = await Cart.findByIdAndUpdate(id,req.body,{new:true});
      const result= await cart.populate('product')
    console.log(result);
    res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json(error);
    }
  };