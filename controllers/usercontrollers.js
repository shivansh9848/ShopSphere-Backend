const User = require("../models/User");

exports.fetchUserById = async (req, res) => {
  const { id } = req.user;
  console.log(id);
  try {
    const user = await User.findById(id);
    res.status(200).json({name:user.name,id:user.id,addresses:user.addresses,email:user.email,role:user.role});
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json(error);
  }
};
