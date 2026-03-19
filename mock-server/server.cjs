/**
 * @fileoverview ShopHub mock server — full production-simulation backend.
 *
 * Features:
 *   • FreeAPI-compatible response envelope { statusCode, data, message, success }
 *   • Artificial delay (100–400 ms) on every request
 *   • Optional random error injection (set MOCK_ERROR_RATE, default 0)
 *   • Token-based auth simulation (no real JWT — readable mock tokens)
 *   • Pagination matching FreeAPI's page/limit/hasNextPage shape
 *   • Content bundle routes for AppInitializer init pipeline
 *
 * Usage:
 *   node mock-server/server.cjs            # normal
 *   MOCK_ERROR_RATE=0.05 node ...          # 5% random 500 errors
 *   MOCK_PORT=3002 node ...               # custom port
 *
 * @module mock-server/server
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.MOCK_PORT || '3001', 10);
const ERROR_RATE = parseFloat(process.env.MOCK_ERROR_RATE || '0');
const MIN_DELAY = parseInt(process.env.MOCK_MIN_DELAY || '120', 10);
const MAX_DELAY = parseInt(process.env.MOCK_MAX_DELAY || '420', 10);

// ---------------------------------------------------------------------------
// DB helpers — reads/writes db.json on every operation (simple, no caching)
// ---------------------------------------------------------------------------

const DB_PATH = path.join(__dirname, 'db.json');

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function ok(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ statusCode, data, message, success: true });
}

function fail(res, message = 'Error', statusCode = 400, errorCode) {
  return res.status(statusCode).json({
    statusCode,
    data: null,
    message,
    success: false,
    ...(errorCode && { errorCode }),
  });
}

function paginate(items, page, limit) {
  const p = Math.max(1, parseInt(page || '1', 10));
  const l = Math.max(1, Math.min(100, parseInt(limit || '10', 10)));
  const start = (p - 1) * l;
  const slice = items.slice(start, start + l);
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / l);
  return {
    data: slice,
    totalItems,
    totalPages,
    currentPage: p,
    limit: l,
    hasPreviousPage: p > 1,
    hasNextPage: p < totalPages,
    previousPage: p > 1 ? p - 1 : null,
    nextPage: p < totalPages ? p + 1 : null,
  };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

const TOKENS = new Map();          // token → user._id
const REFRESH_TOKENS = new Map();  // refreshToken → user._id

function makeToken(userId) {
  const token = `mock-access-${userId}-${Date.now()}`;
  TOKENS.set(token, userId);
  return token;
}

/** Generates a 24-char hex string (MongoDB ObjectId format) */
function makeObjectId() {
  let id = '';
  for (let i = 0; i < 24; i++) {
    id += Math.floor(Math.random() * 16).toString(16);
  }
  return id;
}

function makeRefreshToken(userId) {
  const token = `mock-refresh-${userId}-${Date.now()}`;
  REFRESH_TOKENS.set(token, userId);
  return token;
}

function getUserFromToken(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const userId = TOKENS.get(token);
  if (!userId) return null;
  const db = readDb();
  return db.users.find((u) => u._id === userId) || null;
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Artificial delay ───────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  setTimeout(next, delay);
});

// ── Random error injection ─────────────────────────────────────────────────
app.use((req, res, next) => {
  // Never inject errors on content bundles (init must always succeed)
  if (req.path.startsWith('/content')) return next();
  if (ERROR_RATE > 0 && Math.random() < ERROR_RATE) {
    return fail(res, 'Simulated server error (MOCK_ERROR_RATE)', 500, 'SERVER_ERROR');
  }
  next();
});

// ── Request logger ─────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[mock] ${req.method} ${req.path}`);
  next();
});

// ===========================================================================
// CONTENT BUNDLE ROUTES  (AppInitializer init pipeline)
// ===========================================================================

/**
 * GET /content/:bundle
 *
 * Serves locale and error config bundles from db.json.
 *
 * Network debug rule (visible in DevTools Network tab):
 *   "default-en"    → VITE_CONTENT_SOURCE=local  (local files via mock server)
 *   "be-default-en" → VITE_CONTENT_SOURCE=backend (real CMS)
 */
app.get('/content/:bundle', (req, res) => {
  const { bundle } = req.params;
  // Strip "be-" prefix — both local and backend variants serve the same data
  // from this mock server. In production, the "be-" variant hits the real CMS.
  const key = bundle.replace(/^be-/, '');

  const VALID_BUNDLES = ['default-en', 'default-ar', 'default-error'];
  if (!VALID_BUNDLES.includes(key)) {
    return fail(res, `Unknown bundle: ${bundle}`, 404);
  }

  const db = readDb();
  const data = db.content && db.content[key];

  if (!data) {
    return fail(res, `Bundle "${key}" not found in db.json`, 404);
  }

  return ok(res, data, `${bundle} fetched`);
});

// ===========================================================================
// AUTH ROUTES
// ===========================================================================

/** POST /api/v1/users/login */
app.post('/api/v1/users/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 'Email and password are required');

  const db = readDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );

  if (!user) return fail(res, 'Invalid email or password', 401, 'UNAUTHORIZED');

  const { password: _pw, ...safeUser } = user;
  const accessToken = makeToken(user._id);
  const refreshToken = makeRefreshToken(user._id);

  return ok(res, { user: safeUser, accessToken, refreshToken }, 'Login successful');
});

/** POST /api/v1/users/register */
app.post('/api/v1/users/register', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return fail(res, 'All fields are required');
  }

  const db = readDb();
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return fail(res, 'Email already in use', 409);
  }

  const newUser = {
    id: `user${Date.now()}`,
    _id: `user${Date.now()}`,
    username,
    email,
    password,
    role: 'CUSTOMER',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);

  const { password: _pw, ...safeUser } = newUser;
  const accessToken = makeToken(newUser._id);
  const refreshToken = makeRefreshToken(newUser._id);

  return ok(res, { user: safeUser, accessToken, refreshToken }, 'User registered', 201);
});

/** POST /api/v1/users/refresh-token */
app.post('/api/v1/users/refresh-token', (req, res) => {
  // Check cookie or Authorization header for refresh token
  const cookieHeader = req.headers['cookie'] || '';
  const authHeader = req.headers['authorization'] || '';
  const bodyToken = req.body?.refreshToken;

  const token =
    bodyToken ||
    authHeader.replace(/^Bearer\s+/i, '') ||
    cookieHeader.split(';').find((c) => c.trim().startsWith('refreshToken='))?.split('=')[1];

  const userId = token ? REFRESH_TOKENS.get(token) : null;
  if (!userId) return fail(res, 'Invalid or expired refresh token', 401, 'SESSION_EXPIRED');

  const newAccessToken = makeToken(userId);
  return ok(res, { accessToken: newAccessToken }, 'Token refreshed');
});

// ===========================================================================
// PRODUCT ROUTES
// ===========================================================================

/** GET /api/v1/ecommerce/products */
app.get('/api/v1/ecommerce/products', (req, res) => {
  const db = readDb();
  let items = [...db.products];

  const { q, category, sortBy, sortType, page, limit } = req.query;

  if (q) {
    const query = q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query),
    );
  }

  if (category) {
    items = items.filter((p) => p.category?._id === category || p.category?.name === category);
  }

  if (sortBy) {
    const dir = sortType === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      if (sortBy === 'price') return (a.price - b.price) * dir;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'createdAt') return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
      return 0;
    });
  }

  return ok(res, paginate(items, page, limit), 'Products fetched');
});

/** GET /api/v1/ecommerce/products/:productId */
app.get('/api/v1/ecommerce/products/:productId', (req, res) => {
  const db = readDb();
  const product = db.products.find(
    (p) => p._id === req.params.productId || p.slug === req.params.productId,
  );
  if (!product) return fail(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND');
  return ok(res, product, 'Product fetched');
});

/** POST /api/v1/ecommerce/admin/products */
app.post('/api/v1/ecommerce/admin/products', (req, res) => {
  const user = getUserFromToken(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const { name, description, price, stock, category } = req.body;
  const db = readDb();
  const cat = db.categories.find((c) => c._id === category || c.name === category);
  const newId = makeObjectId();

  const product = {
    id: newId, _id: newId,
    name, description,
    price: parseFloat(price), stock: parseInt(stock, 10),
    category: cat ? { _id: cat._id, name: cat.name } : { _id: category, name: category },
    mainImage: { _id: `img${Date.now()}`, url: 'https://picsum.photos/seed/new-product/400/400' },
    subImages: [], slug: name.toLowerCase().replace(/\s+/g, '-'),
    createdAt: new Date().toISOString(),
  };

  db.products.push(product);
  writeDb(db);
  return ok(res, product, 'Product created', 201);
});

/** PATCH /api/v1/ecommerce/admin/products/:productId */
app.patch('/api/v1/ecommerce/admin/products/:productId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const db = readDb();
  const idx = db.products.findIndex((p) => p._id === req.params.productId);
  if (idx === -1) return fail(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND');

  const { name, description, price, stock, category } = req.body;
  const cat = category
    ? db.categories.find((c) => c._id === category || c.name === category)
    : null;

  if (name !== undefined) db.products[idx].name = name;
  if (description !== undefined) db.products[idx].description = description;
  if (price !== undefined) db.products[idx].price = parseFloat(price);
  if (stock !== undefined) db.products[idx].stock = parseInt(stock, 10);
  if (cat) db.products[idx].category = { _id: cat._id, name: cat.name };

  writeDb(db);
  return ok(res, db.products[idx], 'Product updated');
});

/** DELETE /api/v1/ecommerce/admin/products/:productId */
app.delete('/api/v1/ecommerce/admin/products/:productId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const db = readDb();
  const idx = db.products.findIndex((p) => p._id === req.params.productId);
  if (idx === -1) return fail(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND');

  db.products.splice(idx, 1);
  writeDb(db);
  return ok(res, null, 'Product deleted');
});

// ===========================================================================
// CATEGORY ROUTES
// ===========================================================================

/** GET /api/v1/ecommerce/categories */
app.get('/api/v1/ecommerce/categories', (req, res) => {
  const db = readDb();
  return ok(res, paginate(db.categories, req.query.page, req.query.limit || '100'), 'Categories fetched');
});

/** POST /api/v1/ecommerce/admin/categories */
app.post('/api/v1/ecommerce/admin/categories', (req, res) => {
  const user = getUserFromToken(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const { name, description } = req.body;
  if (!name) return fail(res, 'Category name is required');

  const newId = makeObjectId();
  const db = readDb();
  const cat = {
    id: newId, _id: newId,
    name,
    description: description || '',
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    createdAt: new Date().toISOString(),
  };
  db.categories.push(cat);
  writeDb(db);
  return ok(res, cat, 'Category created', 201);
});

/** PATCH /api/v1/ecommerce/admin/categories/:categoryId */
app.patch('/api/v1/ecommerce/admin/categories/:categoryId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const db = readDb();
  const idx = db.categories.findIndex((c) => c._id === req.params.categoryId);
  if (idx === -1) return fail(res, 'Category not found', 404);

  const { name } = req.body;
  if (name) {
    db.categories[idx].name = name;
    db.categories[idx].slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  writeDb(db);
  return ok(res, db.categories[idx], 'Category updated');
});

/** DELETE /api/v1/ecommerce/admin/categories/:categoryId */
app.delete('/api/v1/ecommerce/admin/categories/:categoryId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const db = readDb();
  const idx = db.categories.findIndex((c) => c._id === req.params.categoryId);
  if (idx === -1) return fail(res, 'Category not found', 404);

  db.categories.splice(idx, 1);
  writeDb(db);
  return ok(res, null, 'Category deleted');
});

// ===========================================================================
// ORDER ROUTES
// ===========================================================================

/** POST /api/v1/ecommerce/orders — create order from checkout */
app.post('/api/v1/ecommerce/orders', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

  const { items, shippingAddress, totalAmount, orderNumber } = req.body;
  const newId = makeObjectId();

  const order = {
    id: newId, _id: newId,
    userId: user._id,
    orderNumber: orderNumber || `ORD-${newId.slice(-6).toUpperCase()}`,
    status: 'PENDING',
    items: Array.isArray(items) ? items : [],
    totalAmount: typeof totalAmount === 'number' ? totalAmount : 0,
    shippingAddress: shippingAddress || {},
    createdAt: new Date().toISOString(),
  };

  const db = readDb();
  db.orders.push(order);
  writeDb(db);
  return ok(res, order, 'Order created', 201);
});

/** GET /api/v1/ecommerce/orders */
app.get('/api/v1/ecommerce/orders', (req, res) => {
  const user = getUserFromToken(req);
  const db = readDb();
  const orders = user
    ? db.orders.filter((o) => o.userId === user._id)
    : [];
  return ok(res, paginate(orders, req.query.page, req.query.limit), 'Orders fetched');
});

/** GET /api/v1/ecommerce/orders/:orderId */
app.get('/api/v1/ecommerce/orders/:orderId', (req, res) => {
  const db = readDb();
  const order = db.orders.find((o) => o._id === req.params.orderId);
  if (!order) return fail(res, 'Order not found', 404, 'ORDER_NOT_FOUND');
  return ok(res, order, 'Order fetched');
});

/** GET /api/v1/ecommerce/admin/orders — all orders (paginated, admin/manager) */
app.get('/api/v1/ecommerce/admin/orders', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const db = readDb();
  // Populate each order with customer info
  const orders = db.orders.map((o) => {
    const customer = db.users.find((u) => u._id === o.userId);
    return {
      ...o,
      customer: customer
        ? { _id: customer._id, username: customer.username, email: customer.email }
        : null,
    };
  });

  // Optional status filter
  const { status } = req.query;
  const filtered = status ? orders.filter((o) => o.status === status) : orders;

  return ok(res, paginate(filtered, req.query.page, req.query.limit), 'Orders fetched');
});

/** GET /api/v1/ecommerce/admin/orders/:orderId */
app.get('/api/v1/ecommerce/admin/orders/:orderId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const db = readDb();
  const order = db.orders.find((o) => o._id === req.params.orderId);
  if (!order) return fail(res, 'Order not found', 404, 'ORDER_NOT_FOUND');

  const customer = db.users.find((u) => u._id === order.userId);
  return ok(res, {
    ...order,
    customer: customer
      ? { _id: customer._id, username: customer.username, email: customer.email }
      : null,
  }, 'Order fetched');
});

/** PATCH /api/v1/ecommerce/admin/orders/:orderId/status */
app.patch('/api/v1/ecommerce/admin/orders/:orderId/status', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return fail(res, 'Forbidden', 403, 'FORBIDDEN');
  }

  const VALID_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  const { status } = req.body || {};
  if (!status || !VALID_STATUSES.includes(status)) {
    return fail(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  const db = readDb();
  const idx = db.orders.findIndex((o) => o._id === req.params.orderId);
  if (idx < 0) return fail(res, 'Order not found', 404, 'ORDER_NOT_FOUND');

  db.orders[idx] = { ...db.orders[idx], status };
  writeDb(db);
  return ok(res, db.orders[idx], 'Order status updated');
});

// ===========================================================================
// CART ROUTES
// ===========================================================================

/** POST /api/v1/ecommerce/cart/merge (guest cart merge on login) */
app.post('/api/v1/ecommerce/cart/merge', (_req, res) => {
  return ok(res, { message: 'Cart merged' }, 'Cart merged');
});

/** GET /api/v1/ecommerce/cart */
app.get('/api/v1/ecommerce/cart', (req, res) => {
  const user = getUserFromToken(req);
  const db = readDb();
  const items = user ? db.cartItems.filter((c) => c.userId === user._id) : [];
  return ok(res, { items, couponApplied: null }, 'Cart fetched');
});

// ===========================================================================
// WISHLIST ROUTES
// ===========================================================================

/** GET /api/v1/ecommerce/wishlist (legacy path) */
app.get('/api/v1/ecommerce/wishlist', (req, res) => {
  const user = getUserFromToken(req);
  const db = readDb();
  const items = user ? db.wishlistItems.filter((w) => w.userId === user._id) : [];
  return ok(res, { items }, 'Wishlist fetched');
});

/** GET /api/v1/ecommerce/profile/wishlist (FreeAPI-compatible path) */
app.get('/api/v1/ecommerce/profile/wishlist', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  const db = readDb();
  const items = db.wishlistItems.filter((w) => w.userId === user._id);
  return ok(res, { items, totalItems: items.length }, 'Wishlist fetched');
});

/** POST /api/v1/ecommerce/wishlist/item/:productId (legacy path) */
app.post('/api/v1/ecommerce/wishlist/item/:productId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

  const db = readDb();
  const existing = db.wishlistItems.findIndex(
    (w) => w.userId === user._id && w.productId === req.params.productId,
  );

  if (existing >= 0) {
    db.wishlistItems.splice(existing, 1);
    writeDb(db);
    return ok(res, null, 'Removed from wishlist');
  }

  db.wishlistItems.push({ userId: user._id, productId: req.params.productId });
  writeDb(db);
  return ok(res, null, 'Added to wishlist');
});

/** POST /api/v1/ecommerce/profile/wishlist/:productId (FreeAPI-compatible toggle) */
app.post('/api/v1/ecommerce/profile/wishlist/:productId', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

  const db = readDb();
  const existing = db.wishlistItems.findIndex(
    (w) => w.userId === user._id && w.productId === req.params.productId,
  );

  if (existing >= 0) {
    db.wishlistItems.splice(existing, 1);
    writeDb(db);
    return ok(res, { wishlisted: false }, 'Removed from wishlist');
  }

  db.wishlistItems.push({ userId: user._id, productId: req.params.productId });
  writeDb(db);
  return ok(res, { wishlisted: true }, 'Added to wishlist');
});

// ===========================================================================
// 404 fallback
// ===========================================================================

app.use((req, res) => {
  fail(res, `Route not found: ${req.method} ${req.path}`, 404);
});

// ===========================================================================
// Start
// ===========================================================================

app.listen(PORT, () => {
  console.log(`\n🚀  Mock server running at http://localhost:${PORT}`);
  console.log(`    Error rate : ${(ERROR_RATE * 100).toFixed(0)}%`);
  console.log(`    Delay      : ${MIN_DELAY}–${MAX_DELAY} ms`);
  console.log(`\n    Content bundles:`);
  console.log(`      GET /content/default-en        (LOCAL locale)`);
  console.log(`      GET /content/default-ar        (LOCAL locale)`);
  console.log(`      GET /content/be-default-en     (BACKEND locale)`);
  console.log(`      GET /content/be-default-ar     (BACKEND locale)`);
  console.log(`      GET /content/default-error     (error config)`);
  console.log(`\n    Auth: customer@test.com / admin@test.com  (Password123)\n`);
});
