const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { memoryStore, getDBStatus } = require("./db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "meet_flipkart_secret_key_2026";

// Mongoose User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, default: "Flipkart Customer" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "customer" },
  createdAt: { type: Date, default: Date.now }
});

let User;
try {
  User = mongoose.model("User");
} catch (_) {
  User = mongoose.model("User", userSchema);
}

// Helper to find user
async function findUserByEmail(email) {
  const dbStatus = getDBStatus();
  if (dbStatus.fallback) {
    return memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
  try {
    return await User.findOne({ email });
  } catch (_) {
    return memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
}

// Helper to save user
async function createUser(userData) {
  const dbStatus = getDBStatus();
  if (dbStatus.fallback) {
    const newUser = {
      _id: "user_" + Date.now(),
      ...userData,
      createdAt: new Date()
    };
    memoryStore.users.push(newUser);
    return newUser;
  }
  try {
    const user = new User(userData);
    return await user.save();
  } catch (_) {
    const newUser = {
      _id: "user_" + Date.now(),
      ...userData,
      createdAt: new Date()
    };
    memoryStore.users.push(newUser);
    return newUser;
  }
}

// 1. Signup Route
router.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters"
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      name: name || "Flipkart Customer",
      email: email.toLowerCase(),
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error during registration",
      details: error.message
    });
  }
});

// 2. Login Route
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error during login",
      details: error.message
    });
  }
});

// 3. User Profile (Protected)
router.get("/auth/profile", authenticateJWT, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// JWT Verification Middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "Access denied. No authorization header provided."
    });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: "Invalid or expired token"
      });
    }
    req.user = decoded;
    next();
  });
}

module.exports = { router, authenticateJWT, User };
