// authRoutes.js - Express Router for authentication endpoints (register, login, logout, me).
// CommonJS; mounted at /api/auth by src/app.js. Thin route declarations -> authController; /me is guarded by authenticate.
//
// ── Architectural role ──────────────────────────────────────────────────────
// This module is a THIN endpoint declaration layer: it maps an HTTP method +
// path to a controller handler and attaches middleware guards. It deliberately
// contains NO business logic, NO request parsing, and NO response shaping —
// those concerns belong to the controller (authController) and the auth guard
// (authMiddleware). Keeping the router thin preserves the scaffold's layered
// architecture (routes -> controllers -> services -> repositories).
//
// ── Mounting & effective paths ──────────────────────────────────────────────
// src/app.js mounts this router with `app.use('/api/auth', authRoutes)`, so the
// router-relative paths declared below resolve to the following effective URLs:
//   POST /register -> /api/auth/register   (public)
//   POST /login    -> /api/auth/login      (public)
//   POST /logout   -> /api/auth/logout     (public; stateless acknowledgement)
//   GET  /me       -> /api/auth/me         (protected by `authenticate`)
// No `/api` or `/auth` prefix is added here — the mount supplies it.
//
// ── Module system / runtime ─────────────────────────────────────────────────
// CommonJS only (`require` / `module.exports`); no ESM. Target Node.js >= 18,
// Express 5.x (uses `express.Router()`). This is a net-new, strictly additive
// module: it neither imports nor mutates any pre-existing scaffold module.

const express = require('express');
// authController exposes the four Express handlers `{ register, login, logout, me }`.
// `register`, `login`, and `me` are async `(req, res, next)` handlers; `logout`
// is a synchronous `(req, res)` handler. Each is passed BY REFERENCE below
// (never invoked) so Express can call it per-request.
const authController = require('../controllers/authController');
// `authenticate(req, res, next)` is the JWT Bearer guard: on success it sets
// `req.user` (the decoded token payload `{ sub, email, role, ... }`) and calls
// `next()`; on any failure it responds `401` directly. Only `authenticate` is
// needed here (these endpoints are not role-scoped, so the role guard is omitted).
const { authenticate } = require('../middleware/authMiddleware');

// Single Express Router instance for the authentication feature. Exported as the
// module's default export so `src/app.js` can mount it directly.
const router = express.Router();

// ── Public endpoints (no authentication guard) ──────────────────────────────
// Self-registration: creates a new account and responds `201` + the public user.
router.post('/register', authController.register); // POST /api/auth/register
// Credential verification: responds `200` + `{ token, user }` on success.
router.post('/login', authController.login); // POST /api/auth/login
// Stateless logout acknowledgement: succeeds with or without a token.
router.post('/logout', authController.logout); // POST /api/auth/logout

// ── Protected endpoint (requires a valid Bearer token) ──────────────────────
// `authenticate` runs BEFORE the handler so `req.user` is populated; without a
// valid token it short-circuits with `401`. The controller reads `req.user.sub`
// to resolve and return the current user.
router.get('/me', authenticate, authController.me); // GET /api/auth/me

// Export the SINGLE express.Router() instance as the default export (NOT an
// object). Consumed by src/app.js as:
//   const authRoutes = require('./routes/authRoutes');
//   app.use('/api/auth', authRoutes);
module.exports = router;
