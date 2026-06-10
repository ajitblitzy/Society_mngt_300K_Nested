# Society Management API — Endpoint Reference

The Society Management application exposes a runnable **Node.js / Express REST API**
offering two first-class capabilities: **Login (authentication)** and **Reporting**.
This document is the consolidated, developer-facing reference for every HTTP endpoint
the API provides — their methods, paths, authentication requirements, request and
response shapes, and status codes.

> These endpoints were added **additively**: they introduce a new HTTP surface without
> altering any pre-existing module. For feature-level walkthroughs, see the
> [Login feature](../features/login.md) and [Reporting feature](../features/reporting.md)
> guides.

## Overview / Conventions

- **Base path.** Every endpoint is mounted under `/api`. Authentication routes live
  under `/api/auth`; reporting routes live under `/api/reports`.
- **Content type.** Requests and responses are JSON (`Content-Type: application/json`)
  by default. The single exception is a report requested as CSV, which is returned as
  `text/csv` (see [Reporting Endpoints](#reporting-endpoints)).
- **Authentication.** Protected endpoints use stateless **JWT Bearer tokens** sent in an
  `Authorization: Bearer <token>` header (see [Authentication](#authentication)).
- **Error envelope.** Every error response — regardless of endpoint or status code —
  uses one uniform shape:

  ```json
  { "error": { "message": "<human-readable message>", "status": <http-status-code> } }
  ```

- **Illustrative examples.** All request and response bodies shown below are
  **illustrative**. Identifier values, tokens, timestamps, and report rows are
  representative samples, not literal fixtures.

## Authentication

The API uses **stateless, signed JSON Web Tokens (JWTs)** for authentication. There is no
server-side session store; a token is self-contained and is verified on every protected
request.

**Obtaining a token.** Call `POST /api/auth/login` with valid credentials. On success the
response includes a `token` field — the signed JWT — alongside the public user object.

**Sending a token.** Present the token on every protected request using the HTTP
`Authorization` header with the `Bearer` scheme:

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOi...
```

If the header is missing or malformed, or carries an expired or otherwise invalid token,
the protected endpoint responds with `401` and the uniform error envelope.

**Security model (brief).**

- Passwords are stored **only** as bcrypt hashes — plaintext passwords are never
  persisted or returned in any response.
- Tokens are signed with the server's `JWT_SECRET` and carry an expiry derived from
  `JWT_EXPIRES_IN` (for example `1h`).
- Authentication failures return a **generic** message to prevent user enumeration — the
  API does not reveal whether the email or the password was the incorrect value.
- Roles are `admin` and `member`; self-service registrations always default to `member`.

> Configuration values such as `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`, and `PORT`
> are supplied through environment variables and documented in `.env.example` and the
> [project README](../../README.md). The real `.env` file is never committed.

## Authentication Endpoints

The authentication router is mounted at `/api/auth`. Three routes are public;
`GET /api/auth/me` is protected.

| Method | Path                 | Auth                            | Description                            |
| ------ | -------------------- | ------------------------------- | -------------------------------------- |
| `POST` | `/api/auth/register` | Public                          | Create a new user account.             |
| `POST` | `/api/auth/login`    | Public                          | Verify credentials and issue a JWT.    |
| `POST` | `/api/auth/logout`   | Public                          | Acknowledge a (stateless) logout.      |
| `GET`  | `/api/auth/me`       | `Authorization: Bearer <token>` | Return the currently authenticated user. |

### `POST /api/auth/register`

**Public.** Creates a new user account and returns the public user object. New users are
always assigned the `member` role — a client-supplied `role` is intentionally ignored to
prevent privilege escalation.

**Request body (JSON):**

| Field      | Type   | Required | Notes                                                              |
| ---------- | ------ | -------- | ------------------------------------------------------------------ |
| `email`    | string | Yes      | A valid email address; used as the login identifier.               |
| `password` | string | Yes      | Minimum 8 characters, including at least one letter and one digit. |
| `name`     | string | No       | Optional display name.                                             |

```http
POST /api/auth/register
Content-Type: application/json

{ "email": "asha@society.org", "password": "passw0rd1", "name": "Asha" }
```

**Success — `201 Created`.** Returns the public user. The response never includes the
stored password hash or any lockout fields.

```json
{ "user": { "id": "u_123", "email": "asha@society.org", "role": "member", "name": "Asha", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" } }
```

**Errors:**

- `400 Bad Request` — a missing or invalid email, or a password that fails the strength
  rule.
- `409 Conflict` — the email is already registered.

```json
{ "error": { "message": "Email already registered", "status": 409 } }
```

### `POST /api/auth/login`

**Public.** Verifies the submitted credentials and, on success, issues a signed JWT.

**Request body (JSON):**

| Field      | Type   | Required | Notes                 |
| ---------- | ------ | -------- | --------------------- |
| `email`    | string | Yes      | The account email.    |
| `password` | string | Yes      | The account password. |

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "asha@society.org", "password": "passw0rd1" }
```

**Success — `200 OK`.** Returns the signed JWT and the public user. Present the `token`
value on subsequent protected requests.

```json
{ "token": "eyJhbGciOi...", "user": { "id": "u_123", "email": "asha@society.org", "role": "member" } }
```

**Errors:**

- `401 Unauthorized` — returned for **any** failure (unknown email, wrong password, or a
  temporarily locked account) with a single generic message. The cause is deliberately
  not distinguished, to avoid user enumeration.

```json
{ "error": { "message": "Invalid email or password", "status": 401 } }
```

### `POST /api/auth/logout`

**Public, stateless.** Acknowledges a logout. Because JWTs are stateless, there is no
server-side session to destroy — the client simply discards its token. No request body is
required.

```http
POST /api/auth/logout
```

**Success — `200 OK`.**

```json
{ "message": "Logged out successfully" }
```

### `GET /api/auth/me`

**Protected** — requires `Authorization: Bearer <token>`. Returns the user represented by
the presented token. No request body.

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOi...
```

**Success — `200 OK`.** Returns the public user.

```json
{ "user": { "id": "u_123", "email": "asha@society.org", "role": "member", "name": "Asha", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" } }
```

**Errors:**

- `401 Unauthorized` — the token is missing, invalid, or expired.
- `404 Not Found` — the token is valid but the referenced user no longer exists.

## Reporting Endpoints

**Every reporting endpoint requires authentication.** Each route is guarded by the same
JWT middleware as `GET /api/auth/me`; a request without a valid
`Authorization: Bearer <token>` header is rejected with `401`. Obtain a token from
`POST /api/auth/login`.

The reporting router is mounted at `/api/reports`.

| Method | Path                 | Auth                            | Description                                         |
| ------ | -------------------- | ------------------------------- | --------------------------------------------------- |
| `GET`  | `/api/reports`       | `Authorization: Bearer <token>` | List the available report types (the catalog).      |
| `GET`  | `/api/reports/:type` | `Authorization: Bearer <token>` | Generate a specific report; supports `?format=csv`. |

The four recognized report types are:

| `:type`       | Title                     |
| ------------- | ------------------------- |
| `members`     | Member Directory          |
| `dues`        | Dues & Collection Summary |
| `outstanding` | Outstanding Payments      |
| `occupancy`   | Occupancy                 |

### `GET /api/reports`

**Protected.** Returns the catalog of report types that can be generated. No request body;
a valid Bearer token is required.

```http
GET /api/reports
Authorization: Bearer eyJhbGciOi...
```

**Success — `200 OK`.** Lists the four report types and their human-readable titles.

```json
{ "reports": [ { "type": "members", "title": "Member Directory" }, { "type": "dues", "title": "Dues & Collection Summary" }, { "type": "outstanding", "title": "Outstanding Payments" }, { "type": "occupancy", "title": "Occupancy" } ] }
```

**Errors:**

- `401 Unauthorized` — no valid token was presented.

### `GET /api/reports/:type`

**Protected.** Generates the report named by the `:type` path parameter.

- **Path parameter** `:type` — one of `members`, `dues`, `outstanding`, or `occupancy`.
- **Query parameter** `?format=csv` (optional) — return the report as a CSV download. When
  the query parameter is absent or set to any other value, JSON is returned (the default).

**JSON response (default).** `200 OK`, `Content-Type: application/json`. The body is a
report envelope carrying the report `type`, its human-readable `title`, a `generatedAt`
timestamp, a `count` of rows, and the `rows` themselves.

```http
GET /api/reports/dues
Authorization: Bearer eyJhbGciOi...
```

```json
{ "type": "dues", "title": "Dues & Collection Summary", "generatedAt": "2026-01-01T00:00:00.000Z", "count": 2, "rows": [ { "unit": "A-101", "amountDue": 1500, "status": "paid" }, { "unit": "B-204", "amountDue": 1500, "status": "outstanding" } ] }
```

**CSV response (`?format=csv`).** `200 OK`, `Content-Type: text/csv`, with a
`Content-Disposition` header that names the download. The body is raw CSV text — a header
row followed by one row per record.

```http
GET /api/reports/dues?format=csv
Authorization: Bearer eyJhbGciOi...
```

Response headers:

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="dues-report.csv"
```

```csv
unit,amountDue,status
A-101,1500,paid
B-204,1500,outstanding
```

**Errors:**

- `400 Bad Request` — an unknown or unsupported `:type` (for example `/api/reports/bogus`).
- `401 Unauthorized` — no valid token was presented.

```json
{ "error": { "message": "Unknown report type", "status": 400 } }
```

## Status Codes

The API uses the following HTTP status codes:

| Code  | Meaning      | When it is used                                                                     |
| ----- | ------------ | ----------------------------------------------------------------------------------- |
| `200` | OK           | Successful `login`, `logout`, `me`, and report requests.                            |
| `201` | Created      | A new user account was created by `POST /api/auth/register`.                        |
| `400` | Bad Request  | Invalid input — a malformed or weak registration payload, or an unknown report `:type`. |
| `401` | Unauthorized | A missing, invalid, or expired token on a protected route, or a failed login.       |
| `404` | Not Found    | A valid token references a user that no longer exists (`GET /api/auth/me`).         |
| `409` | Conflict     | Registration with an email that is already in use.                                  |

## Related documentation

- [Login feature](../features/login.md) — the authentication feature guide (registration,
  login, JWT model, password security, and account lockout).
- [Reporting feature](../features/reporting.md) — the reporting feature guide (report
  types, formats, and the authentication requirement).
- [Project README](../../README.md) — installation, configuration, and run instructions
  for the whole application.
