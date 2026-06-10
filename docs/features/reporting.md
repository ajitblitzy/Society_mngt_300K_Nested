# Reporting

The **Reporting** feature generates Society Management domain reports and returns
them in machine-readable formats. It lets authenticated users retrieve operational
views of the society — a **member directory**, a **dues / collection summary**,
**outstanding payments**, and **occupancy** — as either **JSON** (the default) or a
downloadable **CSV** export.

This capability is part of the layered Node.js / Express REST API (Express 5.x,
CommonJS modules). Its endpoints are mounted under the `/api/reports` prefix, and the
report-source data is held in an **in-memory store** that is seeded at startup, so no
external data service is required to run it. Each report is assembled on demand from
that seed data and serialized into the requested format.

> This document describes **new** behavior added to the repository. The Reporting
> feature was introduced additively and does not modify any pre-existing module.

## Contents

- [Authentication Required](#authentication-required)
- [Report Types](#report-types)
- [Formats](#formats)
- [Endpoints](#endpoints)
- [See Also](#see-also)

## Authentication Required

> **Reporting requires Login.** Every reporting endpoint is access-controlled by the
> Login feature's authentication middleware (`authenticate`). There is **no** way to
> read report data without a valid token.

All `/api/reports/*` routes are guarded. To call any of them you must present a valid
**JWT access token** in an `Authorization` header:

```http
Authorization: Bearer <token>
```

You obtain that token by authenticating through the Login feature — call
`POST /api/auth/login` with valid credentials and use the `token` it returns. See the
[Login feature guide](./login.md) for how to register and log in.

- **Without** an `Authorization: Bearer <token>` header, or with a missing, expired,
  or otherwise invalid token, every reporting endpoint responds with **`401`**.
- **With** a valid token, the endpoint proceeds and responds with **`200`**.

This is the single deliberate coupling between the two features: Reporting reuses the
exact same `authenticate` guard that the [Login feature](./login.md) provides.

## Report Types

Exactly four report types are available. Each is identified by a canonical lowercase
**slug** that is used as the `:type` path segment on the report endpoint:

| Slug          | Report                     | Contents (summary)                                    |
| ------------- | -------------------------- | ----------------------------------------------------- |
| `members`     | Member Directory           | A directory of society members.                       |
| `dues`        | Dues & Collection Summary  | A summary of member dues and collections.             |
| `outstanding` | Outstanding Payments       | The payments that are currently outstanding (unpaid). |
| `occupancy`   | Occupancy                  | Unit occupancy across the society.                    |

These four slugs (`members`, `dues`, `outstanding`, and `occupancy`) are the only
recognized report types. Requesting any other `:type` is rejected — see
[Endpoints](#endpoints).

## Formats

Each report can be returned in one of two formats, selected with the optional
`?format=` query parameter:

| Format | Query parameter      | Response `Content-Type` |
| ------ | -------------------- | ----------------------- |
| JSON   | *(none)* — default   | `application/json`      |
| CSV    | `?format=csv`        | `text/csv`              |

- **JSON is the default.** If no `?format=` query parameter is supplied, the report is
  returned as JSON.
- **CSV is opt-in.** Appending `?format=csv` returns the same report serialized as
  comma-separated rows with a `Content-Type: text/csv` response, suitable for
  downloading into a spreadsheet.

CSV output is produced by a small **built-in, hand-written serializer** — the feature
intentionally adds **no third-party CSV dependency**. Any value other than `json` or
`csv` for `?format=` is not a recognized format.

## Endpoints

The reporting router is mounted at `/api/reports`, so every route below is reachable
under that prefix. **All of them require authentication** (see
[Authentication Required](#authentication-required)) and respond with `401` when no
valid token is presented.

| Method | Path                 | Auth required | Success | Description                                                   |
| ------ | -------------------- | ------------- | ------- | ------------------------------------------------------------- |
| `GET`  | `/api/reports`       | Yes           | `200`   | List the available report types (the report catalog).         |
| `GET`  | `/api/reports/:type` | Yes           | `200`   | Generate the report named by `:type`; supports `?format=csv`. |

For the full request/response reference (headers, query parameters, and response
bodies), see [`../api/endpoints.md`](../api/endpoints.md).

### List report types — `GET /api/reports`

Returns the catalog of report types that can be generated — the four slugs and their
human-readable labels documented under [Report Types](#report-types). Requires a valid
token; responds `401` otherwise.

Illustrative request:

```http
GET /api/reports
Authorization: Bearer <token>
```

### Generate a report — `GET /api/reports/:type`

Generates the report identified by the `:type` path segment, where `:type` is one of
`members`, `dues`, `outstanding`, or `occupancy`. By default the report is returned as
JSON; append `?format=csv` to download it as CSV instead.

- Requires a valid token; responds **`401`** without one.
- An **unknown or unsupported** `:type` (anything outside the four recognized slugs)
  responds with **`400`**.
- On success the endpoint responds with **`200`** and the report in the requested
  format.

Illustrative JSON request (default format):

```http
GET /api/reports/dues
Authorization: Bearer <token>
```

Illustrative CSV request (downloads `text/csv`):

```http
GET /api/reports/dues?format=csv
Authorization: Bearer <token>
```

> The examples above are illustrative. Exact request and response details are
> documented in [`../api/endpoints.md`](../api/endpoints.md).

## See Also

- [`../api/endpoints.md`](../api/endpoints.md) — full API reference (request and
  response details) for every endpoint, including these reporting routes.
- [`./login.md`](./login.md) — the Login feature: how to register, log in, and obtain
  the `Authorization: Bearer <token>` that every reporting endpoint requires.
- [Project README](../../README.md) — installation, configuration, and run
  instructions for the whole application.
