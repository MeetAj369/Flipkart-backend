const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB, getDBStatus } = require("./db");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to Database with Resilient Fallback
connectDB();

// Import Routes
const { router: authRoutes, authenticateJWT } = require("./auth");
const { router: productRoutes } = require("./products");
const cartRoutes = require("./cart");
const orderRoutes = require("./orders");

// Mount API Routes
app.use(authRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(orderRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    database: dbStatus,
    author: "Meet Chauhan (github.com/MeetAj369)"
  });
});

// Interactive API Playground & Documentation Dashboard
app.get("/", (req, res) => {
  const dbStatus = getDBStatus();
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flipkart E-Commerce REST API — Production Gateway</title>
  <link rel="icon" href="https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/fk_fav_icon_16x16-a192e4.ico">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --fk-blue: #2874f0;
      --fk-yellow: #ffe500;
      --bg-dark: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --green: #10b981;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      line-height: 1.6;
      padding: 30px 20px;
    }
    .container { max-width: 1080px; margin: 0 auto; }
    header {
      background: linear-gradient(135deg, #1e3a8a, var(--fk-blue));
      padding: 36px 32px;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(40, 116, 240, 0.25);
      margin-bottom: 30px;
      position: relative;
    }
    .badge {
      display: inline-block;
      background: var(--fk-yellow);
      color: #000;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    p.lead { font-size: 16px; opacity: 0.9; max-width: 700px; }
    .status-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.15);
      font-size: 13px;
    }
    .status-item { display: flex; align-items: center; gap: 8px; }
    .pulse-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 10px var(--green);
    }
    .grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    h2 { font-size: 20px; margin-bottom: 16px; color: #fff; display: flex; align-items: center; gap: 10px; }
    .endpoint {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 14px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    .endpoint-left { display: flex; align-items: center; gap: 12px; }
    .method {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .method.get { background: #0284c7; color: #fff; }
    .method.post { background: #16a34a; color: #fff; }
    .method.put { background: #d97706; color: #fff; }
    .method.delete { background: #dc2626; color: #fff; }
    .path { font-family: monospace; font-size: 14px; font-weight: 600; color: #38bdf8; }
    .desc { font-size: 13px; color: var(--text-muted); }
    .btn-test {
      background: var(--fk-blue);
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-test:hover { background: #1d4ed8; }
    pre.response-box {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 12px;
      font-size: 12px;
      color: #a5f3fc;
      max-height: 250px;
      overflow-y: auto;
      display: none;
      margin-top: 8px;
    }
    footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 13px;
    }
    footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <span class="badge">PRODUCTION READY REST API</span>
      <h1>Flipkart E-Commerce Backend</h1>
      <p class="lead">Engineered by <strong>Meet Chauhan</strong>. Enterprise-grade REST microservices powering product discovery, category catalogs, JWT customer authentication, dynamic cart management, and order fulfillment.</p>
      
      <div class="status-strip">
        <div class="status-item">
          <span class="pulse-dot"></span>
          <span>Status: <strong>Online &amp; Healthy</strong></span>
        </div>
        <div class="status-item">
          <i class="fas fa-database" style="color: #60a5fa;"></i>
          <span>Database: <strong>${dbStatus.mode}</strong></span>
        </div>
        <div class="status-item">
          <i class="fas fa-server" style="color: #a78bfa;"></i>
          <span>Port: <strong>${PORT}</strong></span>
        </div>
      </div>
    </header>

    <div class="grid">
      <!-- Live Endpoint Explorer -->
      <div class="card">
        <h2><i class="fas fa-rocket" style="color: var(--fk-yellow);"></i> Interactive Endpoint Explorer</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Click <strong>Run Test</strong> on any endpoint below to trigger a live request and view real JSON responses in real time.</p>

        <!-- Endpoint: Health -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method get">GET</span>
              <span class="path">/api/health</span>
            </div>
            <button class="btn-test" onclick="runTest('/api/health', 'resp-health')"><i class="fas fa-play"></i> Run Test</button>
          </div>
          <div class="desc">System health check, uptime, and database connectivity.</div>
          <pre id="resp-health" class="response-box"></pre>
        </div>

        <!-- Endpoint: Products -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method get">GET</span>
              <span class="path">/products</span>
            </div>
            <button class="btn-test" onclick="runTest('/products', 'resp-products')"><i class="fas fa-play"></i> Run Test</button>
          </div>
          <div class="desc">Retrieve entire product catalog with filter support (?category=Mobiles&amp;minPrice=50000).</div>
          <pre id="resp-products" class="response-box"></pre>
        </div>

        <!-- Endpoint: Categories -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method get">GET</span>
              <span class="path">/products/categories</span>
            </div>
            <button class="btn-test" onclick="runTest('/products/categories', 'resp-categories')"><i class="fas fa-play"></i> Run Test</button>
          </div>
          <div class="desc">Returns distinct product categories (Mobiles, Laptops, Audio, Accessories).</div>
          <pre id="resp-categories" class="response-box"></pre>
        </div>

        <!-- Endpoint: Single Product -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method get">GET</span>
              <span class="path">/product/prod_001</span>
            </div>
            <button class="btn-test" onclick="runTest('/product/prod_001', 'resp-prod1')"><i class="fas fa-play"></i> Run Test</button>
          </div>
          <div class="desc">Retrieve details for a single product by ID (iPhone 15 Pro).</div>
          <pre id="resp-prod1" class="response-box"></pre>
        </div>

        <!-- Endpoint: Carts -->
        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method get">GET</span>
              <span class="path">/carts</span>
            </div>
            <button class="btn-test" onclick="runTest('/carts', 'resp-carts')"><i class="fas fa-play"></i> Run Test</button>
          </div>
          <div class="desc">Retrieve all active shopping carts in the system.</div>
          <pre id="resp-carts" class="response-box"></pre>
        </div>
      </div>

      <!-- Complete API Schema Documentation -->
      <div class="card">
        <h2><i class="fas fa-book" style="color: #38bdf8;"></i> Full REST API Specifications</h2>

        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method post">POST</span>
              <span class="path">/auth/signup</span>
            </div>
          </div>
          <div class="desc">Register new customer. Body: <code>{"name": "Meet", "email": "user@example.com", "password": "password123"}</code></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method post">POST</span>
              <span class="path">/auth/login</span>
            </div>
          </div>
          <div class="desc">Authenticate user &amp; issue JWT token. Body: <code>{"email": "user@example.com", "password": "password123"}</code></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method get">GET</span>
              <span class="path">/auth/profile</span>
            </div>
          </div>
          <div class="desc">Protected user profile. Requires Header: <code>Authorization: Bearer &lt;token&gt;</code></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method post">POST</span>
              <span class="path">/cart/add</span>
            </div>
          </div>
          <div class="desc">Add or increment product in cart. Body: <code>{"userId": "user_123", "productId": "prod_001", "quantity": 1}</code></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method put">PUT</span>
              <span class="path">/cart/update</span>
            </div>
          </div>
          <div class="desc">Update item quantity in cart. Body: <code>{"userId": "user_123", "productId": "prod_001", "quantity": 2}</code></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-header">
            <div class="endpoint-left">
              <span class="method post">POST</span>
              <span class="path">/orders</span>
            </div>
          </div>
          <div class="desc">Place order / express checkout. Generates tracking number &amp; auto-clears cart.</div>
        </div>
      </div>
    </div>

    <footer>
      <p>&copy; 2026 Flipkart Backend Microservice. Designed &amp; Architected by <a href="https://github.com/MeetAj369" target="_blank">Meet Chauhan</a>.</p>
      <p style="margin-top: 6px;"><a href="https://meetaj369.github.io/Meet-Portfolio/" target="_blank">Visit Meet's Portfolio</a> &bull; <a href="https://github.com/MeetAj369/Flipkart-backend" target="_blank">View GitHub Repository</a></p>
    </footer>
  </div>

  <script>
    async function runTest(endpoint, targetId) {
      const box = document.getElementById(targetId);
      box.style.display = 'block';
      box.textContent = 'Loading ' + endpoint + '...';
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = 'Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}. Route not found.`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err.message
  });
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Flipkart Backend API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
