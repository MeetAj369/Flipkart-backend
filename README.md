# Flipkart E-Commerce REST API Backend

> **Author:** Meet Chauhan ([@MeetAj369](https://github.com/MeetAj369))  
> **Portfolio:** [https://meetaj369.github.io/Meet-Portfolio/](https://meetaj369.github.io/Meet-Portfolio/)  
> **Repository:** [https://github.com/MeetAj369/Flipkart-backend](https://github.com/MeetAj369/Flipkart-backend)

A production-ready, high-performance Node.js & Express REST API simulating Flipkart's e-commerce backend architecture. Features JWT authentication, catalog discovery with category and price filtering, dynamic cart management, order checkout with tracking ID generation, an interactive browser-accessible API explorer at `GET /`, and a dual-resilient database layer (MongoDB Atlas + In-Memory Fallback).

---

## 🌟 Architecture & Features

- **Interactive API Explorer & Documentation (`GET /`)**:
  - Browser-accessible interactive documentation with live "Run Test" buttons.
  - Real-time JSON inspect panel and system health telemetry.

- **Dual-Mode Resilient Database Layer (`db.js`)**:
  - Connects to **MongoDB Atlas** cluster.
  - Automatically activates an in-memory high-speed database store if external cloud connection times out or IP is restricted, guaranteeing 100% server uptime.

- **Customer Authentication & Security (`auth.js`)**:
  - Salted and hashed passwords using `bcryptjs` (cost factor 10).
  - Secure stateless JWT issuance (`HS256`) with configurable expiration.
  - Bearer token verification middleware (`authenticateJWT`).

- **Product Catalog Microservice (`products.js`)**:
  - Pre-seeded with flagship consumer electronics (Apple, Samsung, Dell, Sony).
  - Multi-param query filtering (`?category=Mobiles&minPrice=50000&sort=price_desc&search=iphone`).
  - Category taxonomy endpoint (`/products/categories`).

- **Cart & Order Processing (`cart.js`, `orders.js`)**:
  - Active shopping cart session per user with automatic item price recalculation.
  - Order fulfillment creating unique tracking identifiers (`FKRT...`), auto-clearing the active cart upon checkout.

- **Deployment Ready**:
  - Preconfigured with `vercel.json` for one-click serverless deployment on Vercel or Render.

---

## 📡 REST API Reference

### System
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Interactive Web API Playground & Documentation |
| `GET` | `/api/health` | Health check, uptime, and database status |

### Authentication
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | `{ name, email, password }` | Register new user |
| `POST` | `/auth/login` | `{ email, password }` | Login & receive JWT |
| `GET` | `/auth/profile` | *Header: `Authorization: Bearer <token>`* | Get user profile |

### Products
| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | `category`, `search`, `minPrice`, `maxPrice`, `sort` | Retrieve products catalog |
| `GET` | `/products/categories` | — | Get distinct category list |
| `GET` | `/product/:id` | — | Get single product by ID |
| `POST` | `/products` | `{ name, price, category, ... }` | Create new product |

### Cart & Orders
| Method | Endpoint | Request Body / Params | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/cart/add` | `{ userId, productId, quantity }` | Add/increment item in cart |
| `GET` | `/carts` | — | View all active carts |
| `GET` | `/cart/:userId` | — | View user's active cart |
| `PUT` | `/cart/update` | `{ userId, productId, quantity }` | Update item quantity in cart |
| `DELETE` | `/cart/:id` | — | Clear or delete cart |
| `POST` | `/orders` | `{ userId, items, shippingAddress }` | Checkout & place order |
| `GET` | `/orders/:userId`| — | Get user order history |
| `GET` | `/order/:orderId`| — | Track order by orderId/trackingId |

---

## 🚀 Quick Start Guide

### 1. Installation

```bash
git clone https://github.com/MeetAj369/Flipkart-backend.git
cd Flipkart-backend
npm install
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Run Server

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

The server will start on `http://localhost:8080`. Open that URL in your browser to interact with the API Playground!

---

## 🧪 Testing with cURL

### Retrieve Products
```bash
curl http://localhost:8080/products
```

### Add Item to Cart
```bash
curl -X POST http://localhost:8080/cart/add \
  -H "Content-Type: application/json" \
  -d '{"userId": "meet_001", "productId": "prod_001", "quantity": 1}'
```

### Place Order
```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "meet_001",
    "items": [{"productId": "prod_001", "name": "iPhone 15 Pro", "price": 134900, "quantity": 1}],
    "paymentMethod": "UPI"
  }'
```

---

## 📄 License

Licensed under the MIT License. Created by Meet Chauhan.
