const Product = require("../models/productModel");
const StockMovement = require("../models/stockMovementModel");

const getStockMovements = async (req, res) => {
  try {
    const movements = await StockMovement.find({}).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: movements,
      message: "Stock movement history fetched successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

const createStockMovement = async (req, res) => {
  try {
    const { productId, movementType, quantity, note } = req.body;
    const validTypes = ["stock_in", "stock_out", "adjustment"];

    if (!validTypes.includes(movementType)) {
      return res.status(400).json({
        success: false,
        message: "Movement type must be stock_in, stock_out, or adjustment.",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero.",
      });
    }

    const previousQuantity = Number(product.quantity);
    let newQuantity = previousQuantity;

    if (movementType === "stock_in") {
      newQuantity = previousQuantity + amount;
    }

    if (movementType === "stock_out") {
      if (previousQuantity < amount) {
        return res.status(400).json({
          success: false,
          message: "Stock out quantity exceeds current available stock.",
        });
      }
      newQuantity = previousQuantity - amount;
    }

    if (movementType === "adjustment") {
      newQuantity = previousQuantity + amount;
    }

    await Product.findByIdAndUpdate(productId, { $set: { quantity: newQuantity } });

    const movement = await StockMovement.create({
      productId: product._id,
      productName: product.name,
      movementType,
      quantity: amount,
      previousQuantity,
      newQuantity,
      userId: req.user.sub,
      userName: req.user.name || req.user.email || "System",
      note: note || "Manual stock update",
    });

    return res.status(201).json({
      success: true,
      data: movement,
      message: "Stock movement recorded successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

module.exports = {
  getStockMovements,
  createStockMovement,
};
