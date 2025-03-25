const express = require("express");

const { fetchOrderByUser, createOrder, deleteFromOrder, updateOrder,fetchAllOrders } = require("../controllers/orderscontrollers");
const router = express.Router();
router
  .post("/", createOrder)
  .get('/account/', fetchOrderByUser)
  .delete("/:id", deleteFromOrder)
  .patch("/:id", updateOrder)
  .get('/',fetchAllOrders);
  exports.router = router;
