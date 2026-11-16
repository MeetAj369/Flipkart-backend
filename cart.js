const express = require("express");
const mongoose = require("mongoose");
const { memoryStore, isDbActive } = require("./db");

const router = express.Router();

const cartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String },
  price: { type: Number },
  image: { type: String },
  quantity: { type: Number, required: true, default: 1 }
});

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  status: { type: String, default: "active" },
  items: [cartItemSchema],
  totalAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let Cart;
try {
  Cart = mongoose.model("Cart");
} catch (_) {
  Cart = mongoose.model("Cart", cartSchema);
}

function findProduct(productId) {
  return memoryStore.products.find(p => p._id === productId || p.id === productId);
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
}

// 1. Add item to cart
router.post("/cart/add", async (req, res) => {
  try {
    const { productId, quantity = 1, user, userId } = req.body;
    const uid = userId || user;

    if (!productId || !uid) {
      return res.status(400).json({
        success: false,
        error: "Both 'productId' and 'userId' (or 'user') are required."
      });
    }

    const prod = findProduct(productId);
    const itemPrice = prod ? prod.price : (req.body.price || 999);
    const itemName = prod ? prod.name : (req.body.name || "Product " + productId);
    const itemImage = prod ? prod.image : "https://via.placeholder.com/150";

    if (!isDbActive()) {
      let cart = memoryStore.carts.find(c => c.userId === uid && c.status === "active");
      if (!cart) {
        cart = {
          _id: "cart_" + Date.now(),
          userId: uid,
          status: "active",
          items: [],
          totalAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        memoryStore.carts.push(cart);
      }

      const existingIndex = cart.items.findIndex(i => i.productId === productId);
      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += Number(quantity);
      } else {
        cart.items.push({
          productId,
          name: itemName,
          price: itemPrice,
          image: itemImage,
          quantity: Number(quantity)
        });
      }

      cart.totalAmount = calculateTotal(cart.items);
      cart.updatedAt = new Date();

      return res.status(201).json({
        success: true,
        message: "Item added to cart successfully",
        data: cart
      });
    }

    // MongoDB Mode
    try {
      let cart = await Cart.findOne({ userId: uid, status: "active" });
      if (!cart) {
        cart = new Cart({
          userId: uid,
          status: "active",
          items: [],
          totalAmount: 0
        });
      }

      const existingIndex = cart.items.findIndex(i => i.productId === productId);
      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += Number(quantity);
      } else {
        cart.items.push({
          productId,
          name: itemName,
          price: itemPrice,
          image: itemImage,
          quantity: Number(quantity)
        });
      }

      cart.totalAmount = calculateTotal(cart.items);
      cart.updatedAt = new Date();
      await cart.save();

      return res.status(201).json({
        success: true,
        message: "Item added to cart successfully",
        data: cart
      });
    } catch (_) {
      // Fallback
      let cart = memoryStore.carts.find(c => c.userId === uid && c.status === "active");
      if (!cart) {
        cart = {
          _id: "cart_" + Date.now(),
          userId: uid,
          status: "active",
          items: [],
          totalAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        memoryStore.carts.push(cart);
      }
      return res.status(201).json({ success: true, message: "Item added to cart successfully", data: cart });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to add item to cart",
      details: error.message
    });
  }
});

// 2. Get all carts
router.get("/carts", async (req, res) => {
  try {
    let carts = [];
    if (isDbActive()) {
      try {
        carts = await Cart.find({});
      } catch (_) {
        carts = memoryStore.carts;
      }
    } else {
      carts = memoryStore.carts;
    }

    res.status(200).json({
      success: true,
      count: carts.length,
      data: carts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch carts",
      details: error.message
    });
  }
});

// 3. Get user's cart
router.get("/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let cart = null;

    if (isDbActive()) {
      try {
        cart = await Cart.findOne({ userId, status: "active" });
      } catch (_) {}
    }

    if (!cart) {
      cart = memoryStore.carts.find(c => c.userId === userId && c.status === "active");
    }

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "No active cart found for user",
        data: {
          userId,
          status: "active",
          items: [],
          totalAmount: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve user cart",
      details: error.message
    });
  }
});

// 4. Update item quantity in cart
router.put("/cart/update", async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    if (!userId || !productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: "'userId', 'productId' and 'quantity' are required."
      });
    }

    if (!isDbActive()) {
      const cart = memoryStore.carts.find(c => c.userId === userId && c.status === "active");
      if (!cart) {
        return res.status(404).json({ success: false, error: "Cart not found" });
      }

      if (Number(quantity) <= 0) {
        cart.items = cart.items.filter(i => i.productId !== productId);
      } else {
        const item = cart.items.find(i => i.productId === productId);
        if (item) item.quantity = Number(quantity);
      }
      cart.totalAmount = calculateTotal(cart.items);
      cart.updatedAt = new Date();

      return res.status(200).json({
        success: true,
        message: "Cart item updated",
        data: cart
      });
    }

    const cart = await Cart.findOne({ userId, status: "active" });
    if (!cart) {
      return res.status(404).json({ success: false, error: "Cart not found" });
    }

    if (Number(quantity) <= 0) {
      cart.items = cart.items.filter(i => i.productId !== productId);
    } else {
      const item = cart.items.find(i => i.productId === productId);
      if (item) item.quantity = Number(quantity);
    }

    cart.totalAmount = calculateTotal(cart.items);
    cart.updatedAt = new Date();
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update cart item",
      details: error.message
    });
  }
});

// 5. Delete cart
router.delete("/cart/:id", async (req, res) => {
  try {
    const cartId = req.params.id;

    if (!isDbActive()) {
      const idx = memoryStore.carts.findIndex(c => c._id === cartId || c.userId === cartId);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: "Cart not found" });
      }
      memoryStore.carts.splice(idx, 1);
      return res.status(200).json({
        success: true,
        message: "Cart deleted successfully"
      });
    }

    let cart = await Cart.findById(cartId);
    if (!cart) {
      cart = await Cart.findOne({ userId: cartId, status: "active" });
    }

    if (!cart) {
      return res.status(404).json({ success: false, error: "Cart not found" });
    }

    await Cart.findByIdAndDelete(cart._id);
    res.status(200).json({
      success: true,
      message: "Cart deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete cart",
      details: error.message
    });
  }
});

module.exports = router;
