# Ajit-backprop-test
test project for backprop integration.

---

## Society Management API

This repository now includes a runnable **Node.js / Express REST API** that adds two
first-class capabilities to the Society Management application:

- **Login (JWT authentication)** — credential-based authentication for society
  administrators and members, with secure password storage and stateless, signed access
  tokens.
- **Reporting** — generation of society domain reports (member directory,
  maintenance-dues summary, outstanding payments, and occupancy) returned as JSON or CSV.

These features were added **additively**: the pre-existing scaffold modules
(`src/**/file_*.js` and `src/utils/filler.js`) are left untouched and remain archived in
`society_mgmt_300k.zip`. Nothing in the original project was modified, renamed, moved, or
removed — only new files were introduced (and this README was extended with the
documentation below).

The application follows a **layered architecture** built with **CommonJS modules**, where a
request flows **routes → controllers → services → repositories**, supported by dedicated
`models`, `domain`, `middleware`, `config`, and `utils` layers.

### Prerequisites

- **Node.js >= 18** — matches the `engines.node` field in `package.json`. An Active LTS
  release such as **22.x** is recommended.
- **npm** (ships with Node.js).

### Installation

Install the dependencies from the project root:

```bash
npm install
```

This resolves the runtime dependencies **express `^5.2.1`**, **jsonwebtoken `^9.0.3`**,
**bcryptjs `^3.0.3`**, and **dotenv `^17.4.2`**, plus the development dependencies
**jest `^30.4.2`** and **supertest `^7.2.2`**.

### Configuration

Configuration is supplied through environment variables, loaded once at startup by
`dotenv`. Copy the committed template to a local `.env` file and edit the values for your
environment:

```bash
cp .env.example .env
```

> **Never commit secrets.** The real `.env` file is git-ignored (see `.gitignore`) and must
> never be committed — only the safe placeholder template `.env.example` is tracked in
> version control.

The supported environment variables (defined in `.env.example`) are:

| Variable         | Purpose                                                                       | Example                             |
| ---------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| `JWT_SECRET`     | Secret used to sign and verify JWT access tokens. Set a long, random value.   | `change_me_to_a_long_random_secret` |
| `JWT_EXPIRES_IN` | Access-token lifetime, passed to `jsonwebtoken`'s `expiresIn`.                | `1h`                                |
| `BCRYPT_ROUNDS`  | bcrypt cost factor (salt/work rounds) used when hashing passwords.            | `10`                                |
| `PORT`           | HTTP port the server binds via `app.listen()`.                                | `3000`                              |

### Running

Start the HTTP server (binds the configured `PORT`):

```bash
npm start
```

This runs `node src/server.js`. For local development with automatic restart on file
changes, use:

```bash
npm run dev
```

This runs `node --watch src/server.js`. Once running, the server exposes the authentication
routes under **`/api/auth/*`** and the reporting routes under **`/api/reports/*`**.

### Testing

Run the test suite with Jest in CI mode (single run, no watch):

```bash
npm test
```

This runs `jest --ci` and covers **unit tests** for the authentication and reporting
services (`tests/unit/authService.test.js`, `tests/unit/reportService.test.js`) as well as
**integration tests** that exercise the HTTP endpoints with `supertest`
(`tests/integration/authRoutes.test.js`, `tests/integration/reportRoutes.test.js`).

### API Endpoints

All endpoints are mounted under `/api`. Requests and responses are JSON by default; a report
requested with `?format=csv` is returned as `text/csv`.

#### Authentication — `/api/auth`

| Method | Path                 | Auth   | Description                                           |
| ------ | -------------------- | ------ | ---------------------------------------------------- |
| POST   | `/api/auth/register` | Public | Register a new user account.                         |
| POST   | `/api/auth/login`    | Public | Verify credentials and return a signed JWT.          |
| POST   | `/api/auth/logout`   | Public | Acknowledge logout (stateless — client drops token). |
| GET    | `/api/auth/me`       | Bearer | Return the current authenticated user.               |

`GET /api/auth/me` is protected: it requires an `Authorization: Bearer <token>` header,
returning **`401`** without a valid token and **`200`** with one.

#### Reporting — `/api/reports` (all endpoints require authentication)

| Method | Path                 | Auth   | Description                                                 |
| ------ | -------------------- | ------ | ---------------------------------------------------------- |
| GET    | `/api/reports`       | Bearer | List the available report types.                           |
| GET    | `/api/reports/:type` | Bearer | Generate a report; append `?format=csv` for a CSV download. |

Every reporting endpoint reuses the authentication guard from the Login feature, so a valid
Bearer token is required (a request without one returns `401`). The available `:type` values
are `members`, `dues`, `outstanding`, and `occupancy`; without `?format=csv` the report is
returned as JSON.

**Security model.** Passwords are stored only as **bcrypt hashes** (never plaintext); access
tokens are **JWTs signed with `JWT_SECRET`** that carry an expiry derived from
`JWT_EXPIRES_IN`; and authentication failures return a **single generic error message** to
avoid user enumeration.

### Documentation & Project Layout

Deeper documentation for each capability lives under `docs/`:

- [Login feature](./docs/features/login.md) — authentication design, configuration, and behavior.
- [Reporting feature](./docs/features/reporting.md) — report types, formats, and CSV export.
- [API endpoint reference](./docs/api/endpoints.md) — the full request/response contract for every endpoint.

The feature is organized into the layers below (the archived `file_*.js` scaffold is
intentionally omitted):

```text
.
├── src/
│   ├── app.js            # Express app assembly (mounts routers + middleware)
│   ├── server.js         # HTTP bootstrap (reads PORT, calls app.listen)
│   ├── config/           # Environment loading and auth configuration
│   ├── controllers/      # Request/response handlers (auth, report)
│   ├── services/         # Business logic (auth, report)
│   ├── repositories/     # In-memory data access (user, report)
│   ├── models/           # Record/DTO shapes (user, report)
│   ├── domain/           # Domain entities and enums (user, report)
│   ├── middleware/       # Auth guard, error handler, request logger
│   └── utils/            # Password/token helpers, CSV exporter, logger, validation
├── tests/
│   ├── unit/             # authService, reportService
│   └── integration/      # authRoutes, reportRoutes (supertest)
├── docs/
│   ├── features/         # login.md, reporting.md
│   └── api/              # endpoints.md
├── .env.example          # Environment variable template
└── package.json          # Dependencies and scripts
```
