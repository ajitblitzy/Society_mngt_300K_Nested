# Ajit-backprop-test
test project for backprop integration.

---

## Society Management API — Login & Reporting

This repository now includes a runnable **Node.js / Express REST API** that provides two
first-class capabilities:

- **Login (authentication)** — credential-based registration and login with JWT (JSON Web
  Token) sessions and bcrypt-hashed passwords.
- **Reporting** — generation of Society Management domain reports (for example a member
  directory and maintenance-dues summaries) returned as JSON or CSV.

These features were added **additively**. The pre-existing scaffold modules (the synthetic
`file_*.js` filler corpus) are left untouched and remain archived in
`society_mgmt_300k.zip`; no previously existing behavior is modified.

### Architecture

The application is a layered Node.js backend built with **CommonJS** modules. Requests flow
through clearly separated layers:

```
routes → controllers → services → repositories
```

supported by `models`, `domain`, `middleware`, `config`, and `utils`. Data is held in an
in-memory store, so no external data service is required to run the application.

## Prerequisites

- **Node.js >= 18** (an Active LTS release such as 22.x is recommended). This matches the
  `engines.node` field declared in `package.json`.
- **npm** (bundled with Node.js).

## Installation

Install the dependencies from the repository root:

```bash
npm install
```

This resolves the following packages:

| Type    | Package        | Version    |
| ------- | -------------- | ---------- |
| runtime | `express`      | `^5.2.1`   |
| runtime | `jsonwebtoken` | `^9.0.3`   |
| runtime | `bcryptjs`     | `^3.0.3`   |
| runtime | `dotenv`       | `^17.4.2`  |
| dev     | `jest`         | `^30.4.2`  |
| dev     | `supertest`    | `^7.2.2`   |

## Configuration

Configuration is supplied through environment variables. Copy the example file and edit the
values for your environment:

```bash
cp .env.example .env
```

> **Note:** `.env` is git-ignored and must **never** be committed — only `.env.example` is
> tracked in version control.

The following variables are supported:

| Variable         | Description                                                        | Example                              |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------ |
| `JWT_SECRET`     | Secret used to sign and verify JWTs. Set a strong, random value.   | `change-me-to-a-long-random-string`  |
| `JWT_EXPIRES_IN` | Access-token lifetime (any value accepted by the JWT library).     | `1h`                                 |
| `BCRYPT_ROUNDS`  | bcrypt cost factor used when hashing passwords.                    | `10`                                 |
| `PORT`           | HTTP port the server listens on.                                   | `3000`                               |

## Running

```bash
npm start      # runs: node src/server.js  (boots the HTTP server on PORT)
npm run dev    # development run with auto-restart (node --watch src/server.js)
```

Once the server is running it exposes the feature routes under `/api/auth/*` and
`/api/reports/*`.

## Testing

```bash
npm test
```

`npm test` runs the **Jest** test suite as a single run (Jest does not enter watch mode by
default). For an explicit non-interactive continuous-integration run:

```bash
CI=true npm test -- --ci
```

Coverage includes unit tests for the services (`authService`, `reportService`) and
integration tests for the HTTP routes (`authRoutes`, `reportRoutes`) driven by `supertest`.

## API Endpoints

### Authentication — `/api/auth`

| Method | Path                  | Description                                                                                                                   |
| ------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/auth/register`  | Register a new user.                                                                                                          |
| `POST` | `/api/auth/login`     | Verify credentials and return a signed JWT.                                                                                   |
| `POST` | `/api/auth/logout`    | End the current session.                                                                                                      |
| `GET`  | `/api/auth/me`        | Return the authenticated user. Requires `Authorization: Bearer <token>`; responds `401` without a valid token and `200` with one. |

### Reporting — `/api/reports` (all endpoints require authentication)

| Method | Path                  | Description                                                                                                              |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/reports`        | List the available report types.                                                                                         |
| `GET`  | `/api/reports/:type`  | Generate a report (for example `dues` or `members`). Append `?format=csv` for a `text/csv` download; otherwise JSON is returned. |

All reporting endpoints are guarded by the authentication middleware and reject
unauthenticated requests with `401`.

### Security model

- Passwords are stored **only** as bcrypt hashes — never in plaintext.
- JWTs are signed with `JWT_SECRET` and carry an expiry derived from `JWT_EXPIRES_IN`.
- Authentication failures return **generic** error messages to avoid user enumeration.

## Documentation

More detailed documentation is available under `docs/`:

- [`docs/features/login.md`](docs/features/login.md) — Login (authentication) feature guide.
- [`docs/features/reporting.md`](docs/features/reporting.md) — Reporting feature guide.
- [`docs/api/endpoints.md`](docs/api/endpoints.md) — Full API reference for every endpoint.

## Project layout

The feature is organized into the following layers (the archived scaffold packaged in
`society_mgmt_300k.zip` is intentionally not shown):

```
.
├── src/
│   ├── app.js              # Express application assembly (composition root)
│   ├── server.js           # HTTP bootstrap (app.listen on PORT)
│   ├── routes/             # authRoutes.js, reportRoutes.js
│   ├── controllers/        # authController.js, reportController.js
│   ├── services/           # authService.js, reportService.js
│   ├── repositories/       # userRepository.js, reportRepository.js (in-memory)
│   ├── models/             # userModel.js, reportModel.js
│   ├── domain/             # user.js, report.js
│   ├── middleware/         # authMiddleware.js, errorHandler.js, requestLogger.js
│   ├── config/             # index.js, authConfig.js
│   └── utils/              # passwordUtils.js, tokenUtils.js, csvExporter.js, logger.js, validation.js
├── tests/
│   ├── unit/               # authService.test.js, reportService.test.js
│   └── integration/        # authRoutes.test.js, reportRoutes.test.js
├── docs/
│   ├── features/           # login.md, reporting.md
│   └── api/                # endpoints.md
├── .env.example
├── .gitignore
└── package.json
```
