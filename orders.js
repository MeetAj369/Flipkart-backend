const express = require("express");
const mongoose = require("mongoose");
const { memoryStore, getDBStatus } = require("./db");

const router = express.Router();

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    fullName: { type: String, default: "Customer" },
    addressLine: { type: String, default: "123 Commercial Street" },
    city: { type: String, default: "Bangalore" },
    state: { type: String, default: "Karnataka" },
    postalCode: { type: String, default: "560001" }
  },
  paymentMethod: { type: String, default: "UPI" },
  paymentStatus: { type: String, default: "PAID" },
  orderStatus: { type: String, default: "CONFIRMED" },
  trackingId: { type: String },
  createdAt: { type: Date, default: Date.now },
  estimatedDelivery: { type: Date }
});

let Order;
try {
  Order = mongoose.model("Order");
} catch (_) {
  Order = mongoose.model("Order", orderSchema);
}

// 1. Place order (Checkout)
router.post("/orders", async (req, res) => {
  try {
    const { userId, items, totalAmount, shippingAddress, paymentMethod } = req.body;

    if (!userId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: "User ID and non-empty items array are required to place an order."
      });
    }

    const calculatedTotal = totalAmount || items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const trackingId = "FKRT" + Math.floor(100000000 + Math.random() * 900000000);
    const orderId = "OD" + Date.now();

    const orderData = {
      orderId,
      userId,
      items,
      totalAmount: calculatedTotal,
      shippingAddress: shippingAddress || {
        fullName: "Flipkart Customer",
        addressLine: "Tech Park, Whitefield",
        city: "Bangalore",
        state: "Karnataka",
        postalCode: "560066"
      },
      paymentMethod: paymentMethod || "UPI / Flipkart PayLater",
      paymentStatus: "SUCCESS",
      orderStatus: "CONFIRMED",
      trackingId,
      createdAt: new Date(),
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    };

    const dbStatus = getDBStatus();

    if (dbStatus.fallback) {
      memoryStore.orders.push(orderData);
      // Clear user active cart
      const cart = memoryStore.carts.find(c => c.userId === userId && c.status === "active");
      if (cart) {
        cart.items = [];
        cart.totalAmount = 0;
      }
      return res.status(201).json({
        success: true,
        message: "Order placed successfully! Tracking ID generated.",
        order: orderData
      });
    }

    const order = new Order(orderData);
    await order.save();

    // Clear user active cart
    try {
      const Cart = mongoose.model("Cart");
      await Cart.findOneAndUpdate({ userId, status: "active" }, { items: [], totalAmount: 0 });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: "Order placed successfully! Tracking ID generated.",
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to place order",
      details: error.message
    });
  }
});

// 2. Get user orders
router.get("/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const dbStatus = getDBStatus();

    let orders = [];
    if (dbStatus.fallback) {
      orders = memoryStore.orders.filter(o => o.userId === userId);
    } else {
      orders = await Order.find({ userId }).sort({ createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: error.message
    });
  }
});

// 3. Track order
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const dbStatus = getDBStatus();

    let order = null;
    if (dbStatus.fallback) {
      order = memoryStore.orders.find(o => o.orderId === orderId || o.trackingId === orderId);
    } else {
      order = await Order.findOne({ $or: [{ orderId }, { trackingId: orderId }] });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
