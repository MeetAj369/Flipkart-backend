const express = require("express");
const mongoose = require("mongoose");
const { memoryStore, getDBStatus, isDbActive } = require("./db");

const router = express.Router();

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, default: "Generic" },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  discount: { type: String },
  rating: { type: Number, default: 4.5 },
  ratingCount: { type: Number, default: 100 },
  stock: { type: Number, default: 20 },
  image: { type: String, required: true },
  description: { type: String }
});

let Product;
try {
  Product = mongoose.model("Product");
} catch (_) {
  Product = mongoose.model("Product", productSchema);
}

// 1. Get all products with filters
router.get("/products", async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort } = req.query;
    let items = [];

    if (isDbActive()) {
      try {
        const filter = {};
        if (category) filter.category = new RegExp(category, "i");
        if (search) filter.name = new RegExp(search, "i");
        if (minPrice || maxPrice) {
          filter.price = {};
          if (minPrice) filter.price.$gte = Number(minPrice);
          if (maxPrice) filter.price.$lte = Number(maxPrice);
        }
        items = await Product.find(filter);
      } catch (_) {
        items = [...memoryStore.products];
      }
    } else {
      items = [...memoryStore.products];
    }

    // Apply memory filters if fallback or items array loaded
    if (!isDbActive() || items.length === 0) {
      items = [...memoryStore.products];
      if (category) {
        items = items.filter(p => p.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(p => p.name.toLowerCase().includes(s) || (p.brand && p.brand.toLowerCase().includes(s)));
      }
      if (minPrice) items = items.filter(p => p.price >= Number(minPrice));
      if (maxPrice) items = items.filter(p => p.price <= Number(maxPrice));
    }

    // Sort
    if (sort === "price_asc") {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      items.sort((a, b) => b.price - a.price);
    } else if (sort === "rating") {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    res.status(200).json({
      success: true,
      count: items.length,
      dataSource: getDBStatus().mode,
      products: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
      details: error.message
    });
  }
});

// 2. Get distinct categories
router.get("/products/categories", async (req, res) => {
  try {
    let categories = [];
    if (isDbActive()) {
      try {
        categories = await Product.distinct("category");
      } catch (_) {}
    }
    if (!categories || categories.length === 0) {
      categories = [...new Set(memoryStore.products.map(p => p.category))];
    }
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get product by ID
router.get("/product/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let product = null;

    if (isDbActive()) {
      try {
        product = await Product.findById(id);
      } catch (_) {}
    }

    if (!product) {
      product = memoryStore.products.find(p => p._id === id || p.id === id);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message
    });
  }
});

// 4. Create new product
router.post("/products", async (req, res) => {
  try {
    const { name, brand, category, price, image, description, stock } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        error: "Product name, category, and price are required"
      });
    }

    const newProduct = {
      _id: "prod_" + Date.now(),
      name,
      brand: brand || "Brand",
      category,
      price: Number(price),
      originalPrice: req.body.originalPrice || Math.round(Number(price) * 1.15),
      discount: req.body.discount || "10% off",
      stock: stock ? Number(stock) : 25,
      rating: 4.5,
      ratingCount: 1,
      image: image || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60",
      description: description || "Premium product listed on Flipkart store."
    };

    if (isDbActive()) {
      try {
        const prod = new Product(newProduct);
        await prod.save();
      } catch (_) {
        memoryStore.products.push(newProduct);
      }
    } else {
      memoryStore.products.push(newProduct);
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to create product",
      details: error.message
    });
  }
});

module.exports = { router, Product };
