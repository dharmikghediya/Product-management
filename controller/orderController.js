const mongoose = require("mongoose");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const StockMovement = require("../models/stockMovementModel");
const { sendToUser, sendToRoles } = require("../config/websocket");
const { getDefaultProductOffers, getOffersForProduct } = require("../services/productOfferService");

const notifyOrderChange = (order, message) => {
  const notification = {
    id: `${order._id}-${order.updatedAt?.getTime?.() || Date.now()}`,
    orderId: String(order._id),
    orderNumber: String(order._id).slice(-8).toUpperCase(),
    status: order.status,
    shippingStatus: order.shippingStatus,
    currentLocation: order.currentLocation,
    message,
    createdAt: new Date().toISOString(),
  };
  sendToUser(order.createdBy, "order.notification", notification);
  sendToRoles(["admin", "staff", "manager"], "order.notification", notification, order.createdBy);
};

const calculateOrderSummary = (items) => {
  const normalizedItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const price = Number(item.price);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Each order item must have a quantity greater than zero.");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Each order item must have a valid price.");
    }

    normalizedItems.push({
      productId: item.productId,
      productName: item.productName,
      quantity,
      price,
    });

    totalAmount += quantity * price;
  }

  return {
    items: normalizedItems,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

const getOrders = async (req, res) => {
  try {
    const isUser = req.user.role === "user";
    const filter = isUser ? { createdBy: req.user.sub } : {};

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: orders,
      message: "Orders fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (req.user.role === "user" && String(order.createdBy) !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: "You can only view your own orders." });
    }
    return res.status(200).json({ success: true, data: order, message: "Order fetched successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: error.message });
  }
};

const updateShippingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { shippingStatus, trackingNumber, currentLocation, estimatedDelivery } = req.body;

    const allowedShippingStatuses = ["not_shipped", "shipped", "in_transit", "out_for_delivery", "delivered"];
    if (shippingStatus && !allowedShippingStatuses.includes(shippingStatus)) {
      return res.status(400).json({ success: false, message: "Invalid shipping status." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (shippingStatus) order.shippingStatus = shippingStatus;
    if (trackingNumber !== undefined) order.trackingNumber = String(trackingNumber).trim();
    if (currentLocation !== undefined) order.currentLocation = String(currentLocation).trim();
    if (estimatedDelivery !== undefined) order.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;

    await order.save();

    const locationNote = order.currentLocation ? ` Current location: ${order.currentLocation}.` : "";
    notifyOrderChange(order, `Shipping details for order #${String(order._id).slice(-8).toUpperCase()} were updated.${locationNote}`);

    return res.status(200).json({ success: true, data: order, message: "Shipping status updated successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: error.message });
  }
};

const updateOrderItemImage = async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const index = Number(itemIndex);
    const image = req.body?.image;
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: "Invalid order item." });
    }
    if (typeof image !== "string" || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(image)) {
      return res.status(400).json({ success: false, message: "Choose a PNG, JPEG, WebP, or GIF image." });
    }
    const base64 = image.slice(image.indexOf(",") + 1);
    if (Buffer.byteLength(base64, "base64") > 2 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Order item images must be 2 MB or smaller." });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    if (!order.items[index]) return res.status(404).json({ success: false, message: "Order item not found." });
    order.items[index].image = image;
    await order.save();
    return res.status(200).json({ success: true, data: order, message: "Order item image uploaded." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    const {
      items,
      customerName,
      notes,
      paymentMethod = "cash_on_delivery",
      deliveryAddress = "",
      contactPhone = "",
    } = req.body;

    if (paymentMethod !== "cash_on_delivery") {
      return res.status(400).json({ success: false, message: "Payment method must be cash on delivery." });
    }

    const normalizedAddress = typeof deliveryAddress === "string" ? deliveryAddress.trim() : "";
    const normalizedPhone = typeof contactPhone === "string" ? contactPhone.trim() : "";
    const normalizedCustomerName = typeof customerName === "string" ? customerName.trim() : "";

    if (normalizedAddress.length < 10 || normalizedAddress.length > 500) {
      return res.status(400).json({ success: false, message: "Enter a delivery address between 10 and 500 characters." });
    }

    if (req.user.role === "user") {
      const digitCount = normalizedPhone.replace(/\D/g, "").length;
      if (normalizedCustomerName.length < 2 || normalizedCustomerName.length > 100) {
        return res.status(400).json({ success: false, message: "Enter a delivery name between 2 and 100 characters." });
      }
      if (!/^[+\d\s()-]{7,20}$/.test(normalizedPhone) || digitCount < 7) {
        return res.status(400).json({ success: false, message: "Enter a valid contact phone number for delivery." });
      }
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: "Order items are required.",
      });
    }

    const productIds = items.map((item) => String(item.productId));
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const defaultOffers = await getDefaultProductOffers();

    const preparedItems = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product id: ${item.productId}`,
        });
      }

      const product = productMap.get(String(item.productId));
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found for item ${item.productId}`,
        });
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} quantity must be greater than zero.`,
        });
      }

      if (quantity > Number(product.quantity)) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${product.quantity}`,
        });
      }

      const listPrice = Number(product.price) || 0;
      const eligibleOffers = getOffersForProduct(product, defaultOffers)
        .filter((offer) => quantity >= Math.max(1, Number(offer.minQuantity) || 1))
        .map((offer) => {
          const value = Number(offer.value) || 0;
          const savings = Math.round(Math.min(listPrice, offer.discountType === "fixed" ? value : listPrice * value / 100) * 100) / 100;
          return { offer, savings };
        })
        .sort((left, right) => right.savings - left.savings);
      const bestOffer = eligibleOffers[0]?.savings > 0 ? eligibleOffers[0] : null;
      const discount = bestOffer?.savings || 0;
      const unitPrice = Math.max(0, Math.round((listPrice - discount) * 100) / 100);
      const lineTotal = quantity * unitPrice;
      preparedItems.push({
        productId: product._id,
        productName: product.name,
        productColor: product.color || "",
        image: product.image || "",
        listPrice,
        discount,
        offerTitle: bestOffer?.offer.title || "",
        quantity,
        price: unitPrice,
      });
      totalAmount += lineTotal;
      totalDiscount += discount * quantity;
    }

    const order = await Order.create({
      customerName: normalizedCustomerName || req.user.name || req.user.email || "Walk-in Customer",
      notes: notes || "",
      paymentMethod,
      deliveryAddress: normalizedAddress,
      contactPhone: normalizedPhone,
      totalAmount: Number(totalAmount.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      createdBy: req.user.sub,
      items: preparedItems,
    });

    for (const item of preparedItems) {
      const product = productMap.get(String(item.productId));
      const previousQuantity = Number(product.quantity);
      const newQuantity = previousQuantity - item.quantity;

      await Product.findByIdAndUpdate(item.productId, { $set: { quantity: newQuantity } });

      await StockMovement.create({
        productId: item.productId,
        productName: item.productName,
        movementType: "order_sale",
        quantity: item.quantity,
        previousQuantity,
        newQuantity,
        userId: req.user.sub,
        userName: req.user.name || req.user.email || "System",
        note: `Order ${order._id} sale`,
      });
    }

    notifyOrderChange(order, `Order #${String(order._id).slice(-8).toUpperCase()} was placed and is waiting for confirmation.`);

    return res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Choose pending, confirmed, processing, shipped, delivered, or cancelled.",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.status === "cancelled" && status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "A cancelled order cannot be reopened because its stock has already been restored.",
      });
    }

    const legacyStatus = order.status === "completed" ? "delivered" : order.status;
    const allowedNextStatuses = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };
    if (status !== legacyStatus && !allowedNextStatuses[legacyStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Order status cannot move from ${legacyStatus} to ${status}.`,
      });
    }

    if (status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const previousQuantity = Number(product.quantity);
          const newQuantity = previousQuantity + item.quantity;
          await Product.findByIdAndUpdate(item.productId, { $set: { quantity: newQuantity } });

          await StockMovement.create({
            productId: item.productId,
            productName: item.productName,
            movementType: "order_cancel",
            quantity: item.quantity,
            previousQuantity,
            newQuantity,
            userId: req.user.sub,
            userName: req.user.name || req.user.email || "System",
            note: `Order ${order._id} cancelled`,
          });
        }
      }
    }

    order.status = status;
    if (status === "shipped" || status === "delivered") order.shippingStatus = status;
    await order.save();
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    notifyOrderChange(order, `Order #${String(order._id).slice(-8).toUpperCase()} is now ${statusLabel}.`);

    return res.status(200).json({
      success: true,
      data: order,
      message: "Order status updated successfully.",
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
  calculateOrderSummary,
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateShippingStatus,
  updateOrderItemImage,
};
