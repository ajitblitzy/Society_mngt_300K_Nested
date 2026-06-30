# Reporting

The **Reporting** feature generates Society Management domain reports and returns them in
machine-readable formats. It exposes the society's operational data — the **member
directory**, the **dues & collection summary**, **outstanding payments**, and **occupancy** —
as either JSON (the default) or CSV, so that clients and downstream tools can consume the
data programmatically or download it as a spreadsheet-friendly file.

Reporting is implemented as a vertical slice of the layered Express 5.x REST API
(route → controller → service → repository), written in CommonJS and targeting Node.js 18 or
newer. Crucially, **Reporting depends on Login**: every reporting endpoint is access-controlled
by the authentication guard introduced by the [Login](./login.md) feature, so a valid access
token is required before any report data can be read.

> **Scope note.** This document describes new, additive functionality, and the report-source
> data layer is a lightweight **in-memory store** seeded at startup. For the complete,
> authoritative request/response reference (every field and every error response), see the
> [API endpoint reference](../api/endpoints.md).

## Authentication Required

**Every reporting endpoint is protected.** Reporting reuses the exact `authenticate`
middleware provided by the [Login](./login.md) feature — this is the single deliberate
coupling between the two features and the reason *Reporting depends on Login*.

To call any reporting endpoint you must present a valid JSON Web Token (JWT) in the HTTP
`Authorization` header using the `Bearer` scheme:

```http
Authorization: Bearer <token>
```

- **Obtain a token** by authenticating through `POST /api/auth/login`. See the
  [Login feature](./login.md) for how credentials are verified and how the token is issued.
- **With a valid token** → the request proceeds and returns `200`.
- **Without a token, or with an invalid or expired token** → the request is rejected with
  `401` before any report logic runs, so no report data is ever reachable unauthenticated.

Any authenticated society user may read reports; no additional role is required for the
reporting endpoints.

## Report Types

Reporting produces exactly the four society domain reports below. Each is identified by a
stable, lowercase, URL-safe **slug** that is used directly as the `:type` path segment of
`GET /api/reports/:type`.

| `:type` slug  | Report title               | What it covers                                          |
| ------------- | -------------------------- | ------------------------------------------------------- |
| `members`     | Member Directory           | A directory of the society's members.                   |
| `dues`        | Dues & Collection Summary  | A summary of maintenance dues and amounts collected.    |
| `outstanding` | Outstanding Payments       | Outstanding (unpaid) payment balances.                  |
| `occupancy`   | Occupancy                  | Occupancy status across the society's units.            |

These four types are the complete set; there are no other report types.

## Formats

A report can be returned in either of two formats, selected with the optional `format` query
parameter on `GET /api/reports/:type`:

- **JSON (default).** When no `format` query is supplied (or it is not `csv`), the report is
  returned as JSON.
- **CSV (`?format=csv`).** When the request includes `?format=csv`, the report is returned as
  a downloadable CSV file served with `Content-Type: text/csv`.

CSV output is produced by a small, **built-in vanilla serializer** — Reporting deliberately
ships with no third-party CSV dependency. The exact response headers and body shapes for both
formats are documented in the [API endpoint reference](../api/endpoints.md).

## Endpoints

The reporting router is mounted at `/api/reports`, so the routes below resolve to the
effective URLs shown. **Both endpoints require a valid Bearer token** (see
[Authentication Required](#authentication-required)); a request without one returns `401`.

| Method | Path                 | Auth   | Success | Description                              |
| ------ | -------------------- | ------ | ------- | ---------------------------------------- |
| GET    | `/api/reports`       | Bearer | `200`   | List the available report types (catalog). |
| GET    | `/api/reports/:type` | Bearer | `200`   | Generate a report as JSON (default) or CSV. |

The request examples below are **illustrative** — the token shown is a placeholder and real
values will differ at runtime.

### List report types — `GET /api/reports`

Returns the catalog of available report types. **Protected** — requires a valid
`Authorization: Bearer <token>` header.

Illustrative request:

```http
GET /api/reports
Authorization: Bearer <token>
```

- With a valid token → `200` with the list of available report types.
- Without a valid token → `401`.

### Generate a report — `GET /api/reports/:type`

Generates the report named by the `:type` path segment. **Protected** — requires a valid
`Authorization: Bearer <token>` header.

- **Path parameter `:type`** — one of `members`, `dues`, `outstanding`, or `occupancy`.
- **Query parameter `format`** (optional) — set `?format=csv` to receive a CSV download; any
  other value (or none) returns JSON.

Illustrative request (JSON, the default):

```http
GET /api/reports/dues
Authorization: Bearer <token>
```

Illustrative request (CSV download):

```http
GET /api/reports/dues?format=csv
Authorization: Bearer <token>
```

Responses and status codes:

- With a valid token and a known `:type` → `200`, returning the report as JSON by default or
  as `text/csv` when `?format=csv` was supplied.
- An unknown or unsupported `:type` (for example `/api/reports/bogus`) → `400`.
- Without a valid token → `401`.

For the full field-by-field response contract and the exact error envelope, see the
[API endpoint reference](../api/endpoints.md).

## See Also

- [API endpoint reference](../api/endpoints.md) — the full, authoritative request/response
  reference for every reporting (and authentication) endpoint, including all error responses.
- [Login feature](./login.md) — how to authenticate and obtain the Bearer token that every
  reporting endpoint requires (Reporting depends on Login).
- [Project README](../../README.md) — installation, configuration, and run instructions.
