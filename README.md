# Ajit-backprop-test

> A production-ready Node.js HTTP server built on **Express.js 5.x** with comprehensive middleware, structured logging, environment configuration, and PM2 deployment support.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-Cluster_Mode-2B037A?logo=pm2&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Middleware Stack](#middleware-stack)
- [PM2 Deployment](#pm2-deployment)
- [Logging](#logging)

---

## Prerequisites

Before getting started, ensure you have the following installed on your system:

| Requirement | Version    | Notes                                                  |
|-------------|------------|--------------------------------------------------------|
| **Node.js** | >= 20.0.0  | LTS recommended — required by Express 5.x (needs >=18)|
| **npm**     | >= 10.0.0  | Ships with Node.js 20+                                |
| **PM2**     | Latest     | Production only: install globally with `npm install pm2 -g` |

---

## Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd ajit-backprop-test

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your desired configuration (defaults work for development)

# 4. Start the development server (with auto-reload)
npm run dev

# 5. Or start the production server
npm start
```

The server will start on the port specified in your `.env` file (default: **3000**). Visit `http://localhost:3000/health` to verify it is running.

---

## Project Structure

```
ajit-backprop-test/
├── .env                        # Local environment variables (git-ignored)
├── .env.example                # Environment variable template (committed)
├── .gitignore                  # Version control exclusion patterns
├── .nvmrc                      # Node.js version pinning (v20)
├── ecosystem.config.js         # PM2 process manager configuration
├── package.json                # Project manifest and dependencies
├── README.md                   # Project documentation (this file)
├── server.js                   # Application entry point — HTTP listener and graceful shutdown
└── src/
    ├── app.js                  # Express application assembly — middleware pipeline and route mounting
    ├── config/
    │   └── index.js            # Centralized environment configuration loader
    ├── middleware/
    │   ├── errorHandler.js     # Global error handling middleware
    │   ├── notFound.js         # 404 catch-all for unmatched routes
    │   └── requestLogger.js    # Morgan-to-Winston HTTP request logging bridge
    ├── routes/
    │   ├── api.routes.js       # API route definitions (/api)
    │   ├── health.routes.js    # Health check endpoint (/health)
    │   └── index.js            # Root route aggregator — mounts all sub-routers
    └── utils/
        └── logger.js           # Winston structured logging utility
```

### Architecture Overview

The application follows a **separation of concerns** pattern:

- **`server.js`** handles HTTP listener binding, graceful shutdown (SIGTERM/SIGINT), and process-level error handling — kept separate from app configuration to support testability.
- **`src/app.js`** assembles the Express instance with the full middleware pipeline and mounts all routes — can be imported independently by test frameworks without starting the server.
- **`src/config/`** centralizes all environment variable loading via `dotenv`, exporting a validated configuration object.
- **`src/routes/`** organizes endpoints into modular route files mounted under logical path prefixes.
- **`src/middleware/`** contains custom Express middleware for error handling, 404 responses, and request logging.
- **`src/utils/`** provides shared utilities, starting with the Winston logger.

---

## Environment Configuration

All configurable values are loaded from environment variables via the `src/config/index.js` module. Copy `.env.example` to `.env` and adjust as needed.

| Variable               | Description                                      | Default         | Valid Values                                          |
|------------------------|--------------------------------------------------|-----------------|-------------------------------------------------------|
| `PORT`                 | Server listening port                            | `3000`          | Any valid port number                                 |
| `NODE_ENV`             | Runtime environment identifier                   | `development`   | `development`, `staging`, `production`                |
| `LOG_LEVEL`            | Winston logging verbosity level                  | `debug` (dev) / `info` (prod) | `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly` |
| `CORS_ORIGIN`          | Allowed CORS origins                             | `*`             | `*` (all), or comma-separated origin URLs             |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter time window in milliseconds         | `900000` (15 min) | Any positive integer                                  |
| `RATE_LIMIT_MAX`       | Maximum requests allowed per rate limit window   | `100`           | Any positive integer                                  |

> **Note:** The `.env` file is excluded from version control via `.gitignore`. Never commit real secrets or production credentials. Use `.env.example` as the reference template.

---

## Available Scripts

All scripts are defined in `package.json` and executed via `npm`:

| Command              | Description                                           | Underlying Command                    |
|----------------------|-------------------------------------------------------|---------------------------------------|
| `npm start`          | Start the production server                           | `node server.js`                      |
| `npm run dev`        | Start the development server with auto-reload         | `nodemon server.js`                   |
| `npm run pm2:start`  | Start the application using PM2 process manager       | `pm2 start ecosystem.config.js`       |
| `npm run pm2:stop`   | Stop all PM2-managed processes for this app           | `pm2 stop ecosystem.config.js`        |
| `npm run pm2:logs`   | View real-time PM2 log output                         | `pm2 logs`                            |

---

## API Endpoints

The following HTTP endpoints are available:

| Method | Path        | Description                                                      | Response Format |
|--------|-------------|------------------------------------------------------------------|-----------------|
| `GET`  | `/health`   | Health check — returns server status, uptime, timestamp, and environment | JSON            |
| `GET`  | `/api`      | API welcome message                                              | JSON            |
| `GET`  | `/api/info` | Server metadata and information                                  | JSON            |

### Example Responses

**`GET /health`**

```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "development"
}
```

**`GET /api`**

```json
{
  "status": "success",
  "message": "Welcome to the API",
  "version": "1.0.0"
}
```

**`GET /api/info`**

```json
{
  "status": "success",
  "data": {
    "name": "ajit-backprop-test",
    "version": "1.0.0",
    "description": "Express.js API server",
    "nodeVersion": "v20.20.2",
    "platform": "linux",
    "uptime": 123.456
  }
}
```

---

## Middleware Stack

The Express middleware pipeline is applied in the following order within `src/app.js`. **Order matters** — security middleware runs first, error handling runs last.

| Order | Middleware             | Package / Module                  | Purpose                                                      |
|-------|------------------------|-----------------------------------|--------------------------------------------------------------|
| 1     | **Helmet**             | `helmet`                          | Sets secure HTTP response headers (CSP, HSTS, X-Frame-Options, etc.) |
| 2     | **CORS**               | `cors`                            | Configures Cross-Origin Resource Sharing headers and policies |
| 3     | **Compression**        | `compression`                     | Compresses response bodies with gzip/deflate encoding        |
| 4     | **JSON Body Parser**   | `express.json()`                  | Parses incoming JSON request bodies                          |
| 5     | **URL-Encoded Parser** | `express.urlencoded()`            | Parses URL-encoded form data                                 |
| 6     | **Request Logger**     | `src/middleware/requestLogger.js` | Logs HTTP requests via Morgan, piped into Winston             |
| 7     | **Rate Limiter**       | `express-rate-limit`              | Limits request frequency per IP to prevent abuse/DDoS        |
| 8     | **Routes**             | `src/routes/index.js`             | Application route handlers (`/health`, `/api`)               |
| 9     | **404 Not Found**      | `src/middleware/notFound.js`      | Catches unmatched routes and generates a 404 error           |
| 10    | **Error Handler**      | `src/middleware/errorHandler.js`  | Global error handler — logs errors, returns standardized JSON |

### Error Response Format

All errors are returned in a consistent JSON structure:

```json
{
  "status": "error",
  "statusCode": 500,
  "message": "Internal Server Error"
}
```

In development mode, the original error message is preserved in the response. In production, server errors (5xx) return a generic "Internal Server Error" message to prevent information disclosure. Stack traces are always logged via Winston but are never included in the HTTP response body.

---

## PM2 Deployment

[PM2](https://pm2.keymetrics.io/) is configured as the production process manager via `ecosystem.config.js`. It provides cluster mode, auto-restart, log management, and zero-downtime deployments.

### Quick Start

```bash
# Install PM2 globally (production servers)
npm install pm2 -g

# Start in development mode (cluster, all CPU cores)
pm2 start ecosystem.config.js

# Start in production mode (cluster mode, all CPU cores)
pm2 start ecosystem.config.js --env production

# View running processes
pm2 list

# Monitor in real time
pm2 monit

# View logs
pm2 logs

# Restart the application
pm2 restart ecosystem.config.js

# Stop the application
pm2 stop ecosystem.config.js

# Remove from PM2 process list
pm2 delete ecosystem.config.js
```

### Cluster Mode

In production, PM2 runs the application in **cluster mode**, spawning one worker process per CPU core. This enables:

- **Horizontal scaling** across all available CPU cores
- **Zero-downtime restarts** — PM2 restarts workers one at a time during `pm2 reload`
- **Automatic restart** if a worker crashes or exceeds the 300 MB memory limit
- **Merged logging** — logs from all cluster instances are combined into single log files

### Configuration Summary

| Setting              | Development         | Production                      |
|----------------------|---------------------|---------------------------------|
| `exec_mode`          | `cluster`           | `cluster`                       |
| `instances`          | `max` (all CPU cores) | `max` (all CPU cores)         |
| `NODE_ENV`           | `development`       | `production`                    |
| `PORT`               | `3000`              | `3000`                          |
| `LOG_LEVEL`          | `debug`             | `info`                          |
| `max_memory_restart` | `300M`              | `300M`                          |
| `watch`              | `false`             | `false`                         |
| `autorestart`        | `true`              | `true`                          |

### Log Files

PM2 writes its own process logs to the `logs/` directory:

- **`logs/pm2-error.log`** — stderr output and error messages
- **`logs/pm2-out.log`** — stdout output and general messages

### Persistence Across Reboots

```bash
# Generate startup script for your OS
pm2 startup

# Save the current process list
pm2 save

# The application will auto-start after server reboots
```

---

## Logging

The application uses a **dual-layer logging strategy** combining HTTP request logging with structured application logging.

### Application Logging (Winston)

[Winston](https://github.com/winstonjs/winston) provides structured, level-based application logging configured in `src/utils/logger.js`.

| Environment   | Console Transport          | File Transport                              | Default Level |
|---------------|----------------------------|---------------------------------------------|---------------|
| `development` | Colorized, human-readable  | Disabled                                    | `debug`       |
| `production`  | JSON formatted             | `logs/error.log` (errors) + `logs/combined.log` (all) | `info`        |

**Log Levels** (from highest to lowest priority):

```
error → warn → info → http → verbose → debug → silly
```

**Usage in application code:**

```javascript
const logger = require('./src/utils/logger');

logger.info('Server started successfully');
logger.error('Database connection failed', { host: 'localhost', port: 5432 });
logger.debug('Request payload', { body: req.body });
```

### HTTP Request Logging (Morgan)

[Morgan](https://github.com/expressjs/morgan) logs every incoming HTTP request. It is integrated with Winston via a custom stream in `src/middleware/requestLogger.js`.

| Environment   | Log Format  | Output                          |
|---------------|-------------|---------------------------------|
| `development` | `dev`       | Colorized, concise (method, URL, status, response time) |
| `production`  | `combined`  | Apache combined log format, piped to Winston            |

### Log Files (Production)

In production, Winston writes log files to the `logs/` directory:

| File                  | Contents                               |
|-----------------------|----------------------------------------|
| `logs/error.log`      | Error-level messages only              |
| `logs/combined.log`   | All messages at the configured level and above |

> **Note:** The `logs/` directory and `*.log` files are excluded from version control via `.gitignore`.

---

## License

This project is licensed under the **ISC License** — see `package.json` for details.
