# Login (Authentication)

The **Login** feature adds credential-based authentication to the Society
Management application for its two kinds of users — **administrators**
(`admin`) and **members** (`member`). It provides user registration, login,
logout, and a "current user" lookup, backed by **secure password storage**
(bcrypt password hashes — plaintext passwords are never stored) and
**stateless, signed JSON Web Token (JWT) access tokens**.

This capability is part of the layered Node.js / Express REST API
(Express 5.x, CommonJS modules). It exposes its endpoints under the
`/api/auth` prefix and contributes a reusable authentication middleware
(`authenticate`) that guards privileged endpoints. The
[Reporting feature](./reporting.md) reuses this same middleware, so every
report endpoint is access-controlled by the Login feature described here.

> This document describes **new** behavior added to the repository. The
> feature was introduced additively and does not modify any pre-existing
> module.

## Contents

- [Configuration](#configuration)
- [Endpoints](#endpoints)
- [JWT / Session Model](#jwt--session-model)
- [Password Security](#password-security)
- [Account Lockout](#account-lockout)
- [Error Handling](#error-handling)
- [See Also](#see-also)

## Configuration

Authentication behavior is controlled by environment variables. They are
loaded at runtime from a local `.env` file, which you create by copying the
tracked template:

```bash
cp .env.example .env
```

> **Security:** the real `.env` file is git-ignored and must **never** be
> committed. Only `.env.example` (which contains no real secrets) is tracked
> in version control.

| Variable         | Purpose                                                                                          | Example                              |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `JWT_SECRET`     | Secret used to sign and verify JWT access tokens. Set a strong, long, random value in your `.env`. | `change-me-to-a-long-random-string`  |
| `JWT_EXPIRES_IN` | Access-token lifetime, forwarded to `jsonwebtoken`'s `expiresIn` option.                          | `1h` (also e.g. `15m`, `7d`)         |
| `BCRYPT_ROUNDS`  | bcrypt cost factor (salt rounds) used when hashing passwords. Higher is more secure but slower.   | `10`                                 |
| `PORT`           | HTTP port the server binds (general run configuration, not auth-specific).                        | `3000`                               |

## Endpoints

The authentication router is mounted at `/api/auth`, so every route below is
reachable under that prefix.

| Method | Path                  | Auth required | Success | Description                                              |
| ------ | --------------------- | ------------- | ------- | -------------------------------------------------------- |
| `POST` | `/api/auth/register`  | No            | `201`   | Register a new user; returns the public user object.     |
| `POST` | `/api/auth/login`     | No            | `200`   | Verify credentials; returns a signed JWT and the user.   |
| `POST` | `/api/auth/logout`    | No            | `200`   | Stateless logout (the client discards its token).        |
| `GET`  | `/api/auth/me`        | Yes           | `200`   | Returns the currently authenticated user.                |

For the full request/response reference (headers, body fields, and error
shapes), see [`../api/endpoints.md`](../api/endpoints.md).

### Registration — `POST /api/auth/register`

Creates a new user account. Newly registered users are assigned the default
role **`member`**; elevation to `admin` is a separate, explicitly authorized
action and never the registration default. On success the endpoint responds
with `201` and the **public** user object — the stored bcrypt password hash is
never included in any response.

Illustrative request body:

```json
{
  "email": "resident@example.com",
  "password": "StrongPass1",
  "name": "Resident One"
}
```

Illustrative `201` response (public user — no password material):

```json
{
  "user": {
    "id": "usr_123",
    "email": "resident@example.com",
    "name": "Resident One",
    "role": "member"
  }
}
```

### Login — `POST /api/auth/login`

Verifies the submitted credentials. On success it responds with `200` and a
JSON body containing a signed JWT access token together with the public user,
i.e. `{ token, user }`. The `token` value is the credential the client
presents on subsequent protected requests.

Illustrative request body:

```json
{
  "email": "resident@example.com",
  "password": "StrongPass1"
}
```

Illustrative `200` response:

```json
{
  "token": "<signed-jwt-access-token>",
  "user": {
    "id": "usr_123",
    "email": "resident@example.com",
    "name": "Resident One",
    "role": "member"
  }
}
```

If the credentials are invalid (or the account is temporarily locked — see
[Account Lockout](#account-lockout)), the endpoint returns a **generic**
authentication error rather than a token (see [Error Handling](#error-handling)).

### Logout — `POST /api/auth/logout`

Because access tokens are **stateless**, logout is fundamentally a client-side
action: the client simply discards its stored token. This endpoint exists as a
conventional, public hook for clients to call and always responds with `200`.
No server-side session state is created or destroyed.

### Current user — `GET /api/auth/me`

Returns the user represented by the presented access token. This route is
**protected**: the client must send the token in an
`Authorization: Bearer <token>` header.

- Without a token, or with a missing/expired/invalid token, the endpoint
  responds with `401`.
- With a valid token, the endpoint responds with `200` and the authenticated
  user.

Illustrative request:

```http
GET /api/auth/me
Authorization: Bearer <signed-jwt-access-token>
```

## JWT / Session Model

The feature uses **stateless, signed JWT access tokens** — there is no
server-side session store to maintain.

- **Signing.** On successful login a token is signed with the secret from
  `JWT_SECRET`. The token carries an expiry derived from `JWT_EXPIRES_IN`,
  which is forwarded verbatim to `jsonwebtoken`'s `expiresIn` option (for
  example `1h`).
- **Transport.** Clients present the token on protected requests via the
  `Authorization: Bearer <token>` HTTP header.
- **Verification.** Every protected route runs the shared `authenticate`
  middleware, which reads the `Authorization` header and verifies the token
  against `JWT_SECRET`. On success it attaches the decoded user to the request
  as `req.user` and lets the handler proceed; if the token is absent, expired,
  malformed, or otherwise invalid, it responds with `401` and the handler is
  never reached.
- **Role guarding.** Beyond verifying identity, the middleware layer can
  restrict a route to specific roles (`admin` / `member`), so privileged
  operations require the appropriate role in addition to a valid token. This
  same `authenticate` guard is what the [Reporting feature](./reporting.md)
  reuses to protect its endpoints.

Because tokens are self-contained and signed, the server does not need to look
anything up to trust a request — it only needs to verify the signature and the
expiry on each call.

## Password Security

Passwords are protected with the `bcryptjs` library (a pure-JavaScript,
zero-native-build bcrypt implementation):

- **Hashes only — never plaintext.** A user record stores only the bcrypt
  password **hash** (a self-describing string encoding the algorithm, cost
  factor, salt, and digest). The original password is never stored, logged, or
  returned in any API response.
- **Asynchronous hashing.** Hashing and verification use the **asynchronous**
  `bcryptjs` API (the promise-returning `hash` / `compare` forms). bcrypt is
  deliberately CPU-intensive, so the asynchronous form is used to avoid
  blocking the Node.js event loop while a hash is computed. The blocking
  synchronous variants are intentionally not used on the server.
- **Configurable cost.** The bcrypt cost factor (salt rounds) is controlled by
  `BCRYPT_ROUNDS` (for example `10`). A fresh, cryptographically random salt is
  generated for every password at the configured cost, so identical passwords
  never produce identical hashes.

## Account Lockout

To slow down brute-force password guessing, the feature tracks failed login
attempts per user:

- Each failed login increments an in-memory `failedAttempts` counter on the
  user record.
- Once attempts cross the configured threshold, a `lockedUntil` timestamp is
  set on the record.
- While a user is locked (the current time is before `lockedUntil`), further
  login attempts are rejected until the lock expires; a successful login clears
  the failure state.

This throttling is implemented with simple **in-memory counters** on the user
record — it does not require any external rate-limiting dependency. Because the
counters live in memory, the lockout state resets when the process restarts.

## Error Handling

Authentication responses are deliberately **generic** to prevent user
enumeration. A failed login returns the same non-specific error (for example
"invalid credentials") regardless of whether the supplied email/username does
not exist or the password was simply wrong. This prevents an attacker from
discovering which accounts exist by comparing error messages. Protected routes
that receive a missing or invalid token return `401` without disclosing why the
token was rejected.

## See Also

- [`../api/endpoints.md`](../api/endpoints.md) — full API reference (request and
  response details) for every endpoint, including these authentication routes.
- [`./reporting.md`](./reporting.md) — the Reporting feature, whose endpoints
  are access-controlled by the `authenticate` middleware documented here.
- [Project README](../../README.md) — installation, configuration, and run
  instructions for the whole application.
