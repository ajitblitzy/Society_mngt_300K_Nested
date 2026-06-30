# Login (Authentication)

The **Login** feature provides credential-based authentication for Society Management
users — both administrators (`admin`) and members (`member`). It secures the application
with two complementary mechanisms: **secure password storage** using salted bcrypt hashes
(passwords are never stored in plaintext) and **stateless, signed JSON Web Token (JWT)
access tokens** that callers present on every protected request.

This feature is implemented as a vertical slice of the layered Express 5.x REST API
(route → controller → service → repository), written in CommonJS and targeting Node.js 18
or newer. It introduces a reusable authentication guard — the `authenticate` middleware —
that other features build on: the **Reporting** feature reuses this exact guard so that
every report endpoint is access-controlled. In other words, *Reporting depends on Login* —
a valid token issued here is what unlocks the reporting endpoints documented in
[Reporting](./reporting.md).

> **Scope note.** This document describes new, additive functionality and the data layer is
> a lightweight in-memory store. For the complete, authoritative request/response reference
> (every field and every error response), see the
> [API endpoint reference](../api/endpoints.md).

## Configuration

All authentication settings are supplied through environment variables. They are loaded
once at startup by [`dotenv`](https://registry.npmjs.org/dotenv) and consumed by the
authentication layer. Copy the committed template `.env.example` to a local `.env` and
override the values for your environment.

| Variable         | Purpose                                                                                                               | Example                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `JWT_SECRET`     | Secret key used to **sign and verify** JWT access tokens. Set a long, random, high-entropy value in your real `.env`. | `change_me_to_a_long_random_secret` |
| `JWT_EXPIRES_IN` | Access-token lifetime, passed to `jsonwebtoken`'s `expiresIn`. Accepts a duration string.                             | `1h` (also `15m`, `7d`)             |
| `BCRYPT_ROUNDS`  | bcrypt cost factor (salt/work rounds) used when hashing passwords. Higher is more secure but slower.                  | `10`                                |
| `PORT`           | HTTP port the server binds. General run configuration — not authentication-specific.                                  | `3000`                              |

> **Never commit secrets.** The real `.env` file is git-ignored and must never be
> committed — only the safe placeholder template `.env.example` is tracked in version
> control. Always replace `JWT_SECRET` with a strong, unique value (for example
> `openssl rand -hex 32`) before deploying.

## Endpoints

The authentication router is mounted at `/api/auth`, so the routes below resolve to the
effective URLs shown. Three endpoints are public; `GET /api/auth/me` is protected and
requires a valid Bearer token.

| Method | Path                 | Auth   | Success | Description                            |
| ------ | -------------------- | ------ | ------- | -------------------------------------- |
| POST   | `/api/auth/register` | Public | `201`   | Register a new user account.           |
| POST   | `/api/auth/login`    | Public | `200`   | Verify credentials and issue a JWT.    |
| POST   | `/api/auth/logout`   | Public | `200`   | Acknowledge logout (stateless).        |
| GET    | `/api/auth/me`       | Bearer | `200`   | Return the current authenticated user. |

All request and response bodies shown below are **illustrative** — tokens, identifiers, and
timestamps are placeholders chosen for clarity and will differ at runtime. For the full
field-by-field contract and the complete set of error responses, see the
[API endpoint reference](../api/endpoints.md).

### Register — `POST /api/auth/register`

Creates a new user account. **Public** (no token required). New users are always assigned
the default role `member`; any client-supplied role is ignored to prevent privilege
escalation. On success the endpoint responds `201` with the **public** user object — the
stored password hash is never returned.

Illustrative request body:

```json
{ "email": "asha@society.org", "password": "passw0rd1", "name": "Asha" }
```

Illustrative `201` response:

```json
{
  "user": {
    "id": "u_123",
    "email": "asha@society.org",
    "role": "member",
    "name": "Asha",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### Login — `POST /api/auth/login`

Verifies the supplied credentials. **Public** (no token required). On success it responds
`200` with a signed JWT and the public user, i.e. `{ token, user }`. The `token` is the JWT
the client stores and presents on subsequent protected requests. On any failure it responds
`401` with a single generic message (see
[Error Handling & Anti-Enumeration](#error-handling--anti-enumeration) below).

Illustrative request body:

```json
{ "email": "asha@society.org", "password": "passw0rd1" }
```

Illustrative `200` response:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "u_123", "email": "asha@society.org", "role": "member" }
}
```

### Logout — `POST /api/auth/logout`

Acknowledges logout. **Public** and **stateless**: because access tokens are self-contained
JWTs, there is no server-side session to destroy. "Logging out" simply means the client
discards its stored token. No request body is required, and the endpoint responds `200`.

Illustrative `200` response:

```json
{ "message": "Logged out successfully" }
```

### Current user — `GET /api/auth/me`

Returns the currently authenticated user. **Protected** — the request **must** include an
`Authorization: Bearer <token>` header.

- With a valid token → `200` with the public user object.
- Without a token, or with an invalid/expired token → `401`.

Illustrative request:

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOi...
```

Illustrative `200` response:

```json
{
  "user": {
    "id": "u_123",
    "email": "asha@society.org",
    "role": "member",
    "name": "Asha",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## JWT / Session Model

Authentication is **stateless**: there is no server-side session store. Instead, a
successful login issues a signed JWT that the client presents on every protected request.

- **Signing.** Tokens are signed with the secret configured in `JWT_SECRET`.
- **Expiry.** Each token carries an expiry derived from `JWT_EXPIRES_IN`, passed through to
  `jsonwebtoken`'s `expiresIn` option (for example `1h`). Once a token expires, the client
  must log in again to obtain a new one.
- **Transport.** Clients send the token in the HTTP `Authorization` header using the
  `Bearer` scheme: `Authorization: Bearer <token>`.
- **Verification.** Every protected route runs the `authenticate` middleware first. It reads
  and verifies the Bearer token; on success it attaches the decoded token payload to the
  request as `req.user` and calls the next handler. If the token is missing, malformed,
  invalid, or expired, the middleware short-circuits the request with `401` and the handler
  never runs.

Because the guard is a standalone middleware, it is reused beyond this feature — the
Reporting endpoints apply the same `authenticate` guard, which is why a token issued by
login is required to read any report.

## Password Security

Passwords are protected with [`bcryptjs`](https://registry.npmjs.org/bcryptjs), a
pure-JavaScript bcrypt implementation that requires no native build step.

- **Hash-only storage.** A user's password is **only ever stored as a bcrypt hash** — the
  plaintext password is never persisted or logged.
- **Asynchronous hashing.** Hashing and comparison use the **asynchronous** `bcryptjs` API.
  Because bcrypt is intentionally CPU-intensive, the async API keeps that work off the
  critical path and avoids blocking the Node.js event loop under load.
- **Configurable cost.** The bcrypt cost factor (salt rounds) is controlled by
  `BCRYPT_ROUNDS`. A higher value increases resistance to brute-force attacks at the cost of
  more CPU time per hash; `10`–`12` is a common range.

## Account Lockout

To slow down brute-force and credential-stuffing attacks, the service applies a simple
account-lockout policy backed entirely by **in-memory counters** — no external
rate-limiting dependency is used.

- Each failed login attempt increments a `failedAttempts` counter on the user record.
- When the threshold is exceeded, a `lockedUntil` timestamp is set on that record.
- While the account is locked (the current time is before `lockedUntil`), further login
  attempts are rejected — even with the correct password — until the lock expires.
- A successful login resets the counter.

Because the counters live in the in-memory store, they reset when the process restarts; the
policy is intentionally lightweight and can be replaced with a durable, distributed limiter
as a future enhancement.

## Error Handling & Anti-Enumeration

Login deliberately returns a **single generic error message** for every failure cause.
Whether the email is unregistered, the password is wrong, or the account is currently
locked, the response is the same `401` carrying the message `Invalid email or password`.

This is an intentional **anti-enumeration** measure: by refusing to reveal *which* part of
the credentials was incorrect — or whether a given email is even registered — the API
prevents an attacker from using login responses to discover valid accounts. All error
responses across the API share a uniform envelope; the complete catalog of error responses
is documented in the [API endpoint reference](../api/endpoints.md).

## See Also

- [API endpoint reference](../api/endpoints.md) — the full, authoritative request/response
  reference for every authentication (and reporting) endpoint, including all error responses.
- [Reporting feature](./reporting.md) — society domain reports; every reporting endpoint is
  access-controlled by this feature's `authenticate` guard (Reporting depends on Login).
- [Project README](../../README.md) — installation, configuration, and run instructions.
