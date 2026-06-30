# Society Management API — Endpoint Reference

This is the consolidated HTTP API reference for the **Society Management** application — a
runnable Node.js/Express REST API. It documents the two capabilities the application
exposes: **Login** (credential-based authentication) and **Reporting** (society domain
reports in JSON or CSV). Every endpoint, request/response shape, and status code listed
here corresponds to the routes under `src/routes/` and their controllers under
`src/controllers/`.

---

## Overview / Conventions

- **Base path.** Every endpoint is mounted under `/api`. Authentication routes live under
  `/api/auth`, and reporting routes live under `/api/reports`.
- **Content type.** Requests and responses are JSON (`Content-Type: application/json`) by
  default. The single exception is a report requested with `?format=csv`, which returns
  `text/csv`.
- **Authentication.** Protected endpoints use stateless **JWT Bearer tokens** supplied in
  the `Authorization` header (see [Authentication](#authentication)).
- **Uniform error envelope.** Every error response — regardless of which endpoint produced
  it — has the same shape: a single `error` object carrying a human-readable `message` and
  the numeric HTTP `status`.

  ```json
  { "error": { "message": "<human-readable message>", "status": 400 } }
  ```

- **Illustrative examples.** All request/response bodies, tokens, identifiers, and report
  rows shown below are illustrative placeholders chosen for clarity; actual values will
  differ at runtime.

---

## Authentication

The API uses a **stateless JWT Bearer token** scheme.

1. **Obtain a token.** Call `POST /api/auth/login` with valid credentials. On success the
   response includes a signed JWT in the `token` field.
2. **Send the token.** Include it on every protected request using the `Authorization`
   header with the `Bearer` scheme:

   ```http
   GET /api/auth/me
   Authorization: Bearer eyJhbGciOi...
   ```

3. **Token lifetime.** Tokens are signed with the server's `JWT_SECRET` and carry an
   expiry derived from `JWT_EXPIRES_IN` (for example `1h`). Once a token expires, the
   client must log in again to obtain a new one. (These settings, along with
   `BCRYPT_ROUNDS` and `PORT`, are configured via environment variables and documented in
   `.env.example`.)

**Security notes.**

- Passwords are stored only as **bcrypt hashes** — never in plaintext.
- Login failures return a **single generic message** (`"Invalid email or password"`) for
  every failure cause, so the API does not reveal whether an email is registered
  (anti-enumeration).
- Roles are `admin` and `member`. New accounts created through public registration always
  default to `member`; a client-supplied role is ignored.

---

## Authentication Endpoints

| Method | Path                 | Auth   | Description                          |
| ------ | -------------------- | ------ | ------------------------------------ |
| POST   | `/api/auth/register` | Public | Create a new user account.           |
| POST   | `/api/auth/login`    | Public | Verify credentials and issue a JWT.  |
| POST   | `/api/auth/logout`   | Public | Acknowledge logout (stateless).      |
| GET    | `/api/auth/me`       | Bearer | Return the current authenticated user. |

### POST /api/auth/register

Create a new user account. **Public** (no token required).

**Request body** (JSON):

| Field      | Type   | Required | Notes                                                          |
| ---------- | ------ | -------- | -------------------------------------------------------------- |
| `email`    | string | yes      | Must be a syntactically valid email address.                   |
| `password` | string | yes      | Minimum 8 characters, including at least one letter and one digit. |
| `name`     | string | no       | Optional display name.                                         |

> A client-supplied `role` is intentionally ignored to prevent privilege escalation; new
> users always default to `member`.

```http
POST /api/auth/register
Content-Type: application/json

{ "email": "asha@society.org", "password": "passw0rd1", "name": "Asha" }
```

**Success — `201 Created`.** Returns the public user (never includes the password hash or
any lockout fields):

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

**Errors.**

- `400 Bad Request` — missing/invalid email, or a password that does not meet the policy.
- `409 Conflict` — the email is already registered.

```json
{ "error": { "message": "Email already registered", "status": 409 } }
```

### POST /api/auth/login

Verify credentials and issue a JWT access token. **Public** (no token required).

**Request body** (JSON):

| Field      | Type   | Required |
| ---------- | ------ | -------- |
| `email`    | string | yes      |
| `password` | string | yes      |

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "asha@society.org", "password": "passw0rd1" }
```

**Success — `200 OK`.** Returns the signed token and the public user:

```json
{ "token": "eyJhbGciOi...", "user": { "id": "u_123", "email": "asha@society.org", "role": "member" } }
```

**Errors.**

- `401 Unauthorized` — returned for **any** failure cause (unknown email, wrong password,
  or a locked account) with a single generic message, so failures are indistinguishable:

```json
{ "error": { "message": "Invalid email or password", "status": 401 } }
```

### POST /api/auth/logout

Acknowledge logout. **Public** and stateless.

Because access tokens are stateless JWTs, there is no server-side session to destroy —
"logging out" simply means the client discards its token. No request body is required.

```http
POST /api/auth/logout
```

**Success — `200 OK`.**

```json
{ "message": "Logged out successfully" }
```

### GET /api/auth/me

Return the current authenticated user. **Protected** — requires
`Authorization: Bearer <token>`.

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOi...
```

**Success — `200 OK`.** Returns the public user:

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

**Errors.**

- `401 Unauthorized` — the token is missing, invalid, or expired.
- `404 Not Found` — the token is valid but the user no longer exists.

```json
{ "error": { "message": "User not found", "status": 404 } }
```

---

## Reporting Endpoints

> **Every** reporting endpoint is access-controlled: a valid `Authorization: Bearer <token>`
> is required, and a request without one is rejected with `401`.

| Method | Path                 | Auth   | Description                              |
| ------ | -------------------- | ------ | ---------------------------------------- |
| GET    | `/api/reports`       | Bearer | List the available report types (catalog). |
| GET    | `/api/reports/:type` | Bearer | Generate a specific report (JSON or CSV). |

The four valid report types and their titles are:

| `:type`       | Title                       |
| ------------- | --------------------------- |
| `members`     | Member Directory            |
| `dues`        | Dues & Collection Summary   |
| `outstanding` | Outstanding Payments        |
| `occupancy`   | Occupancy                   |

### GET /api/reports

List the catalog of available report types. **Protected** — requires
`Authorization: Bearer <token>`.

```http
GET /api/reports
Authorization: Bearer eyJhbGciOi...
```

**Success — `200 OK`.**

```json
{
  "reports": [
    { "type": "members", "title": "Member Directory" },
    { "type": "dues", "title": "Dues & Collection Summary" },
    { "type": "outstanding", "title": "Outstanding Payments" },
    { "type": "occupancy", "title": "Occupancy" }
  ]
}
```

**Errors.**

- `401 Unauthorized` — no valid token was supplied.

### GET /api/reports/:type

Generate a single report. **Protected** — requires `Authorization: Bearer <token>`.

**Path parameter.**

- `:type` — one of `members`, `dues`, `outstanding`, or `occupancy`.

**Query parameter.**

- `format` (optional) — set `?format=csv` to receive a CSV download. Any other value, or
  no value at all, returns JSON (the default).

#### JSON (default)

```http
GET /api/reports/dues
Authorization: Bearer eyJhbGciOi...
```

**Success — `200 OK`, `Content-Type: application/json`.** The body is a report envelope:

```json
{
  "type": "dues",
  "title": "Dues & Collection Summary",
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "count": 2,
  "rows": [
    { "unitNumber": "A-101", "memberName": "Asha Rao", "period": "2026-01", "amountDue": 1500, "amountPaid": 1500, "balance": 0 },
    { "unitNumber": "B-204", "memberName": "Vikram Singh", "period": "2026-01", "amountDue": 1500, "amountPaid": 0, "balance": 1500 }
  ]
}
```

The `rows` columns vary per report type and the values above are illustrative.

#### CSV (`?format=csv`)

```http
GET /api/reports/dues?format=csv
Authorization: Bearer eyJhbGciOi...
```

**Success — `200 OK`.** The response sets the following headers and returns raw CSV text
(a header row followed by data rows):

- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="dues-report.csv"`

```csv
unitNumber,memberName,period,amountDue,amountPaid,balance
A-101,Asha Rao,2026-01,1500,1500,0
B-204,Vikram Singh,2026-01,1500,0,1500
```

**Errors.**

- `400 Bad Request` — an unknown `:type` (for example `/api/reports/bogus`).
- `401 Unauthorized` — no valid token was supplied.

```json
{ "error": { "message": "Unknown report type: bogus", "status": 400 } }
```

---

## Status Codes

This API uses the following HTTP status codes:

| Code  | Meaning                | When it occurs                                                      |
| ----- | ---------------------- | ------------------------------------------------------------------- |
| `200` | OK                     | Successful `login`, `logout`, `me`, and report requests.            |
| `201` | Created                | A new account was created by `POST /api/auth/register`.             |
| `400` | Bad Request            | Invalid input (e.g. weak password, missing fields) or unknown report type. |
| `401` | Unauthorized           | Missing/invalid/expired token, or a failed login (generic message). |
| `404` | Not Found              | A valid token references a user that no longer exists.              |
| `409` | Conflict               | Registration with an email that is already in use.                  |

All error responses use the uniform envelope `{ "error": { "message", "status" } }`.

---

## Related documentation

- [Login feature](../features/login.md) — authentication design, configuration, and behavior.
- [Reporting feature](../features/reporting.md) — report types, aggregation, and CSV export.
- [Project README](../../README.md) — setup, run instructions, and a high-level overview.
