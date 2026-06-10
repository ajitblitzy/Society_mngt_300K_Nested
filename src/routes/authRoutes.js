// authRoutes.js - Express Router for authentication endpoints (register, login, logout, me).
// CommonJS; mounted at /api/auth by src/app.js. Thin route declarations -> authController; /me is guarded by authenticate.
//
// ROUTE LAYER (Login feature). This module is a THIN HTTP endpoint declaration:
// it maps an HTTP method + path to a controller handler and, for the protected
// route, attaches the authentication guard. It owns ONLY the routing table. By
// design this layer contains:
//   * NO business logic              -- the auth service owns credential checks, token issuance, lockout.
//   * NO request parsing/validation  -- the controller (and validation util) own that.
//   * NO response shaping            -- the controller sets body, status code, and headers.
//   * NO token/role logic            -- token verification lives in authMiddleware; this file
//                                       only ATTACHES the `authenticate` guard, by reference.
//
// MOUNTING: `src/app.js` mounts this router with
//   const authRoutes = require('./routes/authRoutes');
//   app.use('/api/auth', authRoutes);
// so every path declared here is RELATIVE to `/api/auth`. The router therefore
// declares router-relative paths only and never repeats the `/api` or `/auth`
// prefix (Express prepends the mount path). Effective paths:
//   POST /register -> /api/auth/register   POST /login  -> /api/auth/login
//   POST /logout   -> /api/auth/logout     GET  /me     -> /api/auth/me
//
// ENDPOINT ACCESS POLICY (AAP 0.5.1 Group 2, criterion C3):
//   * /register, /login, /logout are PUBLIC -- a caller must be able to reach them
//     without already holding a token (you cannot log in if login requires a token).
//     `logout` is stateless and deliberately left unguarded so it always succeeds
//     with or without a token (no dependency on auth state).
//   * /me is PROTECTED -- the `authenticate` guard is listed BEFORE the handler so it
//     runs first: it verifies the `Authorization: Bearer <jwt>` header and sets
//     `req.user` (the decoded payload). Without a valid token it responds `401` and
//     the controller never executes. `authController.me` then reads `req.user.sub`.
//     `requireRole` is intentionally NOT imported/applied: auth endpoints are not
//     role-scoped. This is verified by tests/integration/authRoutes.test.js
//     (401 without a token, 200 with one).
//
// STRICTLY ADDITIVE (non-regression mandate, AAP 0.1.2 / 0.8, criteria C1/C2/C5):
// this is a net-new CommonJS module. It does NOT modify, import, reference, or copy
// logic from any pre-existing read-only scaffold module (the synthetic arithmetic
// padding modules that export nothing); those scaffold modules remain byte-identical.
// All wiring here is brand-new `require`/`module.exports`, the sanctioned additive
// convention for this feature.

'use strict';

// ---------------------------------------------------------------------------
// Dependencies (CommonJS; net-new wiring only). Exactly three -- the HTTP
// framework, the authentication controller, and the authentication guard. Routes
// talk ONLY to controllers + middleware: no service, repository, or util is
// required here (those are reached transitively through the controller).
// ---------------------------------------------------------------------------

// Express 5.x -- provides `express.Router()`, the mini-application used to declare
// this feature's endpoints and attach the guard before mounting under `/api/auth`.
const express = require('express');

// Authentication controller -- the thin HTTP adapters wired to the routes below:
//   * register(req, res, next) -> POST /api/auth/register  (201 + public user)
//   * login(req, res, next)    -> POST /api/auth/login     (200 + { token, user })
//   * logout(req, res)         -> POST /api/auth/logout    (200; stateless ack)
//   * me(req, res, next)       -> GET  /api/auth/me        (200 + { user }; reads req.user.sub)
// register/login/me are async handlers and logout is sync; all are passed BY
// REFERENCE (no `()` invocation) so Express calls them with (req, res, next) when a
// matching request arrives.
const authController = require('../controllers/authController');

// Authentication guard (the only piece of authMiddleware this router needs). Only
// `authenticate` is destructured -- `requireRole` is deliberately left out so no
// unused symbol is imported. `authenticate(req, res, next)` verifies the Bearer JWT,
// sets `req.user`, or responds `401` directly and short-circuits the chain.
const { authenticate } = require('../middleware/authMiddleware');

// ---------------------------------------------------------------------------
// Router instance. Mounted by src/app.js at `/api/auth`; paths below are
// router-relative.
// ---------------------------------------------------------------------------
const router = express.Router();

// ---------------------------------------------------------------------------
// Public authentication endpoints (no guard). These must be reachable without a
// token so a client can create an account, obtain a token, or sign out.
// ---------------------------------------------------------------------------

// POST /api/auth/register -- create a new user account; controller returns 201 + the
// public (password-stripped) user representation.
router.post('/register', authController.register);

// POST /api/auth/login -- verify credentials and issue a signed JWT; controller
// returns 200 + { token, user }. Errors are generic to avoid user enumeration.
router.post('/login', authController.login);

// POST /api/auth/logout -- stateless acknowledgement (the JWT is stateless, so there
// is no server session to destroy); controller returns 200. Left UNGUARDED so it
// always succeeds whether or not a token is presented.
router.post('/logout', authController.logout);

// ---------------------------------------------------------------------------
// Protected endpoint. `authenticate` is listed BEFORE the controller handler, so it
// runs first: an unauthenticated request is rejected with `401` and the handler is
// never reached. On success it populates `req.user` for the handler to read (C3).
// ---------------------------------------------------------------------------

// GET /api/auth/me -- return the currently authenticated user's profile. Guard first,
// then the controller's me handler (which reads `req.user.sub`).
router.get('/me', authenticate, authController.me);

// ---------------------------------------------------------------------------
// Export the SINGLE express.Router() instance as the default export (NOT an
// object). src/app.js consumes it directly:
//   const authRoutes = require('./routes/authRoutes');
//   app.use('/api/auth', authRoutes);
// ---------------------------------------------------------------------------
module.exports = router;
