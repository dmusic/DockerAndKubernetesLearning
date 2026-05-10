# Technical Specification — Notes REST API

> **Version:** 1.0.0
> **Last Updated:** 2026-02-22
> **Status:** Draft
> **Owner:** Dejan Music

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository & Directory Structure](#3-repository--directory-structure)
4. [Docker & Infrastructure Topology](#4-docker--infrastructure-topology)
5. [nginx Configuration Intent](#5-nginx-configuration-intent)
6. [Environment Variable Contract](#6-environment-variable-contract)
7. [Application Architecture](#7-application-architecture)
8. [Database Design](#8-database-design)
9. [API Design Standards](#9-api-design-standards)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Middleware Stack](#11-middleware-stack)
12. [Error Handling Standard](#12-error-handling-standard)
13. [Logging Strategy](#13-logging-strategy)
14. [Testing Strategy](#14-testing-strategy)
15. [Security Baseline](#15-security-baseline)
16. [Agent Coding Rules](#16-agent-coding-rules)
17. [Service Resiliency & Outage Management](#17-service-resiliency--outage-management)

---

## 1. Project Overview

**What this project is:**
A RESTful Notes API backend with 2 services, notes and notebooks, providing functionality to create, update, delete and list notebooks and notes. Notes are saved as part of notebooks and one notebook can have multiple notes. These service are reached through reverse proxy and requests are routed based on URL path.

**What this project is NOT (out of scope):**
- Frontend / UI of any kind
- Real-time features (WebSockets, SSE)
- File upload / media storage
- Email sending (stubs only, no implementation)
- Payment processing

**Intended consumers of this API:**
- A React/Vue/mobile frontend (built separately)
- Third-party integrations via API key

---

## 2. Technology Stack

| Concern              | Choice                      | Version    | Rationale                                                    |
|----------------------|-----------------------------|------------|--------------------------------------------------------------|
| Runtime              | Node.js                     | 20.x LTS   | LTS stability; native ESM support                            |
| Framework            | Express.js                  | 4.x        | Minimal, well-understood, large ecosystem                    |
| Database             | MongoDB                     | 7.x        | Document model fits the domain; flexible schema evolution    |
| ODM                  | Mongoose                    | 8.x        | Schema validation, middleware hooks, population              |
| Reverse Proxy        | nginx                       | 1.25-alpine| Lightweight; handles SSL termination and upstream routing    |
| Containerization     | Docker + Docker Compose     | Compose v2 | Reproducible environments; single-command startup            |
| Auth                 | JSON Web Tokens (JWT)       | jsonwebtoken 9.x | Stateless; no session store required                  |
| Validation           | Zod                         | 3.x        | Schema-first, TypeScript-friendly, excellent error messages  |
| Logging              | Winston                     | 3.x        | Structured JSON logging; transport flexibility               |
| HTTP logging         | Morgan                      | 1.x        | Request/response logging middleware                          |
| Testing              | Jest + Supertest            | Jest 29.x  | Industry standard; supertest for integration route tests     |
| Linting              | ESLint + Prettier           | ESLint 8.x | Consistent style enforcement                                 |

**Module system:** ES Modules (`"type": "module"` in `package.json`). Use `import/export` throughout. No CommonJS `require()`.

---

## 3. Repository & Directory Structure

The agent must follow this structure exactly. Do not create files or directories outside this layout without updating this spec first.

```
project-root/
│
├── compose.yaml                    # Root integration compose — includes & merges both service projects
├── .gitignore
│
├── nginx/
│   ├── nginx.conf                  # Main nginx config
│   └── conf.d/
│       └── default.conf            # Upstream blocks + location routing for both services
│
├── notebooks-service/              # Self-contained Docker Compose project
│   ├── compose.yaml                # Standalone dev compose (notebooks-api + notebooks-mongodb)
│   ├── compose.prod.yml            # Production overrides — DO NOT MODIFY during dev
│   ├── .env.example                # Source of truth for notebooks-service env variables
│   ├── .env                        # Local values — never commit
│   ├── .eslintrc.json
│   ├── .prettierrc
│   └── api/
│       ├── Dockerfile
│       ├── package.json
│       ├── package-lock.json
│       └── src/
│           ├── app.js              # Express app factory (no listen() call here)
│           ├── server.js           # Entry point — calls app.listen()
│           ├── config/
│           │   ├── env.js          # Validates and exports all env variables
│           │   └── database.js     # Mongoose connection logic
│           ├── middleware/
│           │   ├── auth.js
│           │   ├── validate.js
│           │   ├── errorHandler.js
│           │   └── notFound.js
│           ├── modules/
│           │   └── notebooks/
│           │       ├── notebooks.model.js
│           │       ├── notebooks.routes.js
│           │       ├── notebooks.controller.js
│           │       ├── notebooks.service.js
│           │       └── notebooks.schema.js
│           ├── utils/
│           │   ├── logger.js
│           │   ├── asyncHandler.js
│           │   └── ApiError.js
│           └── routes/
│               └── index.js
│   └── tests/
│       ├── setup.js
│       ├── teardown.js
│       └── notebooks/
│           └── notebooks.test.js
│
├── notes-service/                  # Self-contained Docker Compose project
│   ├── compose.yaml                # Standalone dev compose (notes-api + notes-mongodb)
│   ├── compose.prod.yml            # Production overrides — DO NOT MODIFY during dev
│   ├── .env.example                # Source of truth for notes-service env variables
│   ├── .env                        # Local values — never commit
│   ├── .eslintrc.json
│   ├── .prettierrc
│   └── api/
│       ├── Dockerfile
│       ├── package.json
│       ├── package-lock.json
│       └── src/
│           ├── app.js
│           ├── server.js
│           ├── config/
│           │   ├── env.js
│           │   └── database.js
│           ├── middleware/
│           │   ├── auth.js
│           │   ├── validate.js
│           │   ├── errorHandler.js
│           │   └── notFound.js
│           ├── modules/
│           │   └── notes/
│           │       ├── notes.model.js
│           │       ├── notes.routes.js
│           │       ├── notes.controller.js
│           │       ├── notes.service.js
│           │       └── notes.schema.js
│           ├── utils/
│           │   ├── logger.js
│           │   ├── asyncHandler.js
│           │   ├── ApiError.js
│           │   └── notebooksClient.js    # HTTP client for cross-service calls to notebooks-api
│           └── routes/
│               └── index.js
│   └── tests/
│       ├── setup.js
│       ├── teardown.js
│       └── notes/
│           └── notes.test.js
│
└── SPEC.md
└── REQUIREMENTS.md
└── TASKS.md
```

---

## 4. Docker & Infrastructure Topology

### Services

| Service Name         | Image                           | Internal Port | Compose Project    | Purpose                              |
|----------------------|---------------------------------|---------------|--------------------|--------------------------------------|
| `nginx`              | nginx:1.25-alpine               | 80 (→ host)   | root               | Reverse proxy, entry point           |
| `notebooks-api`      | Custom (./notebooks-service/api)| 3000          | notebooks-service  | Notebooks Express application        |
| `notebooks-mongodb`  | mongo:7.0                       | 27017         | notebooks-service  | Notebooks primary database           |
| `notes-api`          | Custom (./notes-service/api)    | 3000          | notes-service      | Notes Express application            |
| `notes-mongodb`      | mongo:7.0                       | 27017         | notes-service      | Notes primary database               |

### Networks

The project uses a **two-tier network topology**.

#### Per-service internal networks

Each service project defines its own isolated bridge network for API ↔ MongoDB traffic:

| Network               | Members                                    | Purpose                         |
|-----------------------|--------------------------------------------|---------------------------------|
| `notebooks-network`   | `notebooks-api`, `notebooks-mongodb`       | Isolates notebooks DB traffic   |
| `notes-network`       | `notes-api`, `notes-mongodb`               | Isolates notes DB traffic       |

#### Shared integration network (`app-network`)

Defined in the root `compose.yaml`. When the full stack runs, all API containers and `nginx` join this network, enabling:
- `nginx` → `notebooks-api:3000`
- `nginx` → `notes-api:3000`
- `notes-api` → `notebooks-api:3000` (cross-service validation calls)

**Critical rules:**
- `notebooks-mongodb` and `notes-mongodb` must **never** join `app-network` — database ports remain isolated within each service's internal network.
- `notebooks-api` and `notes-api` must **not** expose port 3000 to the host. All external traffic routes through nginx.

### Volumes

| Volume Name              | Compose Project    | Mounted In                            | Purpose                       |
|--------------------------|--------------------|---------------------------------------|-------------------------------|
| `notebooks-mongo-data`   | notebooks-service  | `/data/db` in `notebooks-mongodb`     | Persistent notebooks data     |
| `notes-mongo-data`       | notes-service      | `/data/db` in `notes-mongodb`         | Persistent notes data         |

### Compose File Structure & Merge Strategy

The project uses Docker Compose `include` (requires Compose ≥ 2.20 / Docker Desktop ≥ 4.25) to merge the two service projects and nginx into a single integrated stack. Each service project can also be run in isolation for focused development.

**`notebooks-service/compose.yaml`** — standalone, runs `notebooks-api` + `notebooks-mongodb` only:

```yaml
services:
  notebooks-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    env_file: .env
    depends_on:
      notebooks-mongodb:
        condition: service_healthy
    networks:
      - notebooks-network
    # Port 3000 NOT exposed to host — nginx proxies in the integrated stack

  notebooks-mongodb:
    image: mongo:7.0
    volumes:
      - notebooks-mongo-data:/data/db
    networks:
      - notebooks-network
    # Expose 27017 to host only in dev for DB inspection tools
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

networks:
  notebooks-network:
    driver: bridge

volumes:
  notebooks-mongo-data:
```

**`notes-service/compose.yaml`** — standalone, runs `notes-api` + `notes-mongodb` only:

```yaml
services:
  notes-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    env_file: .env
    depends_on:
      notes-mongodb:
        condition: service_healthy
    networks:
      - notes-network
    # Port 3000 NOT exposed to host — nginx proxies in the integrated stack

  notes-mongodb:
    image: mongo:7.0
    volumes:
      - notes-mongo-data:/data/db
    networks:
      - notes-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

networks:
  notes-network:
    driver: bridge

volumes:
  notes-mongo-data:
```

**`compose.yaml`** (root) — integration compose, merges both service projects and adds nginx:

```yaml
include:
  - notebooks-service/compose.yaml
  - notes-service/compose.yaml

services:
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      notebooks-api:
        condition: service_healthy
      notes-api:
        condition: service_healthy
    networks:
      - app-network

  # Extend included services to also join the shared integration network
  notebooks-api:
    networks:
      - app-network
      - notebooks-network     # retain internal DB connectivity

  notes-api:
    networks:
      - app-network
      - notes-network         # retain internal DB connectivity
    environment:
      NOTEBOOKS_SERVICE_URL: http://notebooks-api:3000

networks:
  app-network:
    driver: bridge
```

### How to Run

| Goal                              | Command                                                        |
|-----------------------------------|----------------------------------------------------------------|
| Full integrated stack             | `docker compose up` (from project root)                        |
| Full stack, rebuild images        | `docker compose up --build` (from project root)                |
| notebooks-service only            | `cd notebooks-service && docker compose up`                    |
| notes-service only                | `cd notes-service && docker compose up`                        |
| Tear down + remove volumes        | `docker compose down -v` (from project root)                   |

---

## 5. nginx Configuration Intent

### Responsibilities of nginx in this project

- Accept all inbound HTTP traffic on port 80
- Route `/api/v1/notebooks/*` requests to the `notebooks-api` service on port 3000
- Route `/api/v1/notes/*` requests to the `notes-api` service on port 3000
- Return 404 for any path that does not match the above routes
- Add standard security headers to all responses
- In production (`compose.prod.yml`): terminate SSL on port 443, redirect 80→443

### Upstream definitions

Two upstream blocks — one per API service. Docker DNS on `app-network` resolves the service names:

```nginx
upstream notebooks_api {
    server notebooks-api:3000;
}

upstream notes_api {
    server notes-api:3000;
}
```

### Routing — location blocks

nginx routes by path prefix to each upstream:

```nginx
location /api/v1/notebooks/ {
    proxy_pass http://notebooks_api;
}

location /api/v1/notes/ {
    proxy_pass http://notes_api;
}

location / {
    return 404;
}
```

### Proxy headers the agent must include

nginx must forward these headers to the Node app so Express can see the real client IP and protocol:

```
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Security headers nginx must add

```
add_header X-Frame-Options         SAMEORIGIN;
add_header X-Content-Type-Options  nosniff;
add_header X-XSS-Protection        "1; mode=block";
add_header Referrer-Policy         "no-referrer-when-downgrade";
```

### Timeouts

```
proxy_connect_timeout  60s;
proxy_send_timeout     60s;
proxy_read_timeout     60s;
```

---

## 6. Environment Variable Contract

Each service is a **separate project** with its own `<service>/.env.example` and `src/config/env.js`. All variables must be validated at startup using Zod — if any required variable is missing the process must exit with a clear error before the server starts.

### Variables shared by both services

| Variable              | Required | Default (dev) | Description                                              |
|-----------------------|----------|---------------|----------------------------------------------------------|
| `NODE_ENV`            | Yes      | `development` | Runtime environment: `development`, `test`, `production` |
| `PORT`                | Yes      | `3000`        | Port Express listens on inside the container             |
| `MONGO_URI`           | Yes      | —             | Full MongoDB connection string (points to own MongoDB)   |
| `MONGO_DB_NAME`       | Yes      | —             | Database name                                            |
| `JWT_SECRET`          | Yes      | —             | Secret for signing JWTs — min 32 characters              |
| `JWT_EXPIRES_IN`      | No       | `7d`          | JWT expiry duration (e.g. `1h`, `7d`)                    |
| `LOG_LEVEL`           | No       | `debug`       | Winston log level: `error`, `warn`, `info`, `debug`      |
| `CORS_ORIGIN`         | No       | `*`           | Allowed CORS origin(s), comma-separated                  |
| `RATE_LIMIT_WINDOW`   | No       | `15`          | Rate limit window in minutes                             |
| `RATE_LIMIT_MAX`      | No       | `100`         | Max requests per window per IP                           |

### Additional variable — notes-service only

| Variable                | Required | Default (integrated)          | Description                                                                                                               |
|-------------------------|----------|-------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `NOTEBOOKS_SERVICE_URL` | No       | `http://notebooks-api:3000`   | Base URL of `notebooks-api` for cross-service validation. Injected by root `compose.yaml`; override for standalone dev.  |

**`notebooks-service/.env.example`:**

```dotenv
NODE_ENV=development
PORT=3000

# MongoDB — connects to notebooks-mongodb container
MONGO_URI=mongodb://notebooks-mongodb:27017
MONGO_DB_NAME=notebooks_dev

# Auth
JWT_SECRET=replace_this_with_a_random_32_plus_character_secret
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

**`notes-service/.env.example`:**

```dotenv
NODE_ENV=development
PORT=3000

# MongoDB — connects to notes-mongodb container
MONGO_URI=mongodb://notes-mongodb:27017
MONGO_DB_NAME=notes_dev

# Auth
JWT_SECRET=replace_this_with_a_random_32_plus_character_secret
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Cross-service — injected by root compose.yaml; override for standalone dev
NOTEBOOKS_SERVICE_URL=http://notebooks-api:3000
```

---

## 7. Application Architecture

### Pattern: Layered / MVC-adjacent

Each domain resource follows a strict four-layer pattern. The agent must not skip layers or mix concerns:

```
Route → Controller → Service → Model
```
`notebooks-service` and `notes-service` are **separate Express applications**, each independently following this pattern. `notebooks-service` owns the `notebooks` resource; `notes-service` owns the `notes` resource. The layer definitions below apply to each service individually:

| Layer          | File                         | Responsibility                                                          |
|----------------|------------------------------|-------------------------------------------------------------------------|
| **Route**      | `[resource].routes.js`       | Declares HTTP method + path, applies middleware, calls controller        |
| **Controller** | `[resource].controller.js`   | Extracts data from `req`, calls service, sends `res`. No business logic. |
| **Service**    | `[resource].service.js`      | All business logic, DB calls via Mongoose model. No `req`/`res` here.   |
| **Model**      | `[resource].model.js`        | Mongoose schema + model definition only. No business logic.             |
| **Schema**     | `[resource].schema.js`       | Zod schemas for request body/params/query validation                    |

### `app.js` responsibilities (and nothing more)

- Create Express app instance
- Apply global middleware (Morgan, CORS, JSON body parser, helmet, rate limiter)
- Mount the root router from `routes/index.js`
- Mount 404 handler
- Mount global error handler (must be last)
- Export the app (do not call `app.listen()` here)

### `server.js` responsibilities

- Import app
- Connect to MongoDB (`config/database.js`)
- Call `app.listen()` only after DB connection is confirmed
- Handle graceful shutdown on `SIGTERM` and `SIGINT`

### `asyncHandler` utility

Every async route handler must be wrapped with `asyncHandler` to forward errors to the global error handler:

```js
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
```

---

## 8. Database Design

### Connection behavior

- Mongoose connects once at startup in `server.js` before `app.listen()`
- Connection string comes exclusively from `config/env.js`
- Mongoose options to always set: `{ dbName: process.env.MONGO_DB_NAME }`
- If connection fails at startup, process exits with code 1
- Mongoose `strictQuery: true` must be set globally

### Naming conventions

- Collection names: **plural, lowercase** (Mongoose default from model name — let Mongoose handle this)
- Field names: **camelCase**
- All schemas must include `timestamps: true` (adds `createdAt`, `updatedAt` automatically)
- `_id` is the MongoDB ObjectId — never create a redundant `id` field; use Mongoose's virtual `.toJSON` transform to expose `id` instead of `_id`

### Standard schema transform (apply to every model)

```js
// Apply in every schema definition
{
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
}
```

---

## 9. API Design Standards

### Base URL

All routes are prefixed: `/api/v1/`

### Versioning

URL-based versioning. Current version: `v1`. New breaking changes introduce `v2` rather than modifying existing routes.

### HTTP Methods & Status Codes

| Operation          | Method   | Success Status | Notes                                 |
|--------------------|----------|----------------|---------------------------------------|
| List resources     | `GET`    | `200`          | Always returns an array               |
| Get single         | `GET`    | `200`          |                                       |
| Create             | `POST`   | `201`          | Returns created resource              |
| Full update        | `PUT`    | `200`          | Returns updated resource              |
| Partial update     | `PATCH`  | `200`          | Returns updated resource              |
| Delete             | `DELETE` | `204`          | No response body                      |
| Auth failure       | —        | `401`          | Missing or invalid token              |
| Permission denied  | —        | `403`          | Valid token, insufficient permissions |
| Not found          | —        | `404`          |                                       |
| Validation error   | —        | `422`          | Invalid request body/params           |
| Server error       | —        | `500`          |                                       |

### Standard Success Response Shape

```json
{
  "success": true,
  "data": { } // or []
}
```

For paginated list responses:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### Pagination

Default query params for list endpoints: `?page=1&limit=20`. Maximum `limit` is 100.

---

## 10. Authentication & Authorization

### Mechanism: JWT Bearer Token

- Login endpoint issues a signed JWT
- Client sends token in `Authorization: Bearer <token>` header on protected routes
- `middleware/auth.js` verifies the token and attaches `req.user` (decoded payload) to the request

### JWT Payload Shape

```json
{
  "sub": "<userId>",
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Roles

| Role    | Description                        |
|---------|------------------------------------|
| `user`  | Standard authenticated user        |
| `admin` | Full access including admin routes |

### Protected vs. Public Routes

- Public routes (no token required): `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- All other routes: require valid JWT
- Admin-only routes: require JWT with `role: "admin"` — enforced by a separate `requireAdmin` middleware

### Password Handling

- Passwords hashed with **bcrypt**, minimum 12 salt rounds
- Plain-text password is never stored, logged, or returned in any response
- Hash/compare logic lives in the User service, not the model (no model hooks for this)

---

## 11. Middleware Stack

Applied in `app.js` in this exact order:

1. `morgan` — HTTP request logging (skip in `test` environment)
2. `cors` — configured from `CORS_ORIGIN` env variable
3. `express-rate-limit` — global rate limiter using `RATE_LIMIT_WINDOW` and `RATE_LIMIT_MAX`
4. `express.json()` — JSON body parser, limit `10kb`
5. `express.urlencoded({ extended: true })` — URL-encoded body parser
6. **Route handlers** (`/api/v1/*` router mounted here)
7. `notFound` middleware — catches any unmatched route
8. `errorHandler` middleware — global error handler, must be absolutely last

---

## 12. Error Handling Standard

### `ApiError` class

All intentional errors thrown in services and controllers must use this class:

```js
// utils/ApiError.js
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;   // Zod validation errors go here
    this.isOperational = true; // Distinguishes known errors from bugs
  }
}

export default ApiError;
```

### Global Error Response Shape

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "details": null
  }
}
```

For validation errors (`422`), `details` contains the Zod error array:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email address" }
    ]
  }
}
```

### Global Error Handler behavior

- If `err.isOperational === true`: use `err.statusCode` and `err.message`
- If `err.name === 'ValidationError'` (Mongoose): respond with `422`
- If `err.code === 11000` (MongoDB duplicate key): respond with `409 Conflict`
- If `err.name === 'JsonWebTokenError'` or `'TokenExpiredError'`: respond with `401`
- All other errors: respond with `500`, log the full error, never expose stack traces in production

---

## 13. Logging Strategy

### Library: Winston

Single logger instance created in `utils/logger.js` and imported where needed.

### Log format

- `development`: colorized, human-readable console output
- `production` / `test`: JSON structured output (easier to parse by log aggregators)

### What must be logged

| Event                          | Level   |
|--------------------------------|---------|
| Server started                 | `info`  |
| DB connection established      | `info`  |
| DB connection error            | `error` |
| Unhandled operational error    | `warn`  |
| Unhandled unexpected error     | `error` |
| Graceful shutdown initiated    | `info`  |

Morgan handles per-request HTTP logging. Winston handles application-level events.

**Never log:** passwords, JWT secrets, full request bodies containing sensitive fields.

---

## 14. Testing Strategy

### Framework: Jest + Supertest

- Test files live in `api/tests/[resource]/[resource].test.js`
- Tests hit the Express app directly via Supertest (no HTTP port needed)
- Use a separate test database — `NODE_ENV=test` must point `MONGO_URI` to a test DB
- Database is cleared between test suites in `setup.js`

### What must be tested per resource

- Happy path for every endpoint
- Validation error cases (missing fields, wrong types)
- Auth-protected endpoints reject unauthenticated requests
- Not found cases (invalid ID)

### Running tests

```bash
npm test           # run all tests
npm run test:watch # watch mode
```

---

## 15. Security Baseline

The agent must implement all of the following. These are non-negotiable:

- **`helmet`** middleware applied globally — sets secure HTTP headers automatically
- **Rate limiting** via `express-rate-limit` (config from env variables) applied globally
- **CORS** explicitly configured — wildcard `*` is acceptable only in development
- **`express.json()` body size limit** of `10kb` — prevents large payload attacks
- **MongoDB injection** — Mongoose + Zod validation prevents this; never pass raw `req.body` directly to Mongoose queries without validation
- **JWT secret minimum length** — enforced at startup validation (minimum 32 characters)
- **bcrypt rounds** — minimum 12
- **No sensitive data in logs** — enforced by code review checklist
- **`trust proxy`** set to `1` in Express so rate limiter and logging see real IP behind nginx: `app.set('trust proxy', 1)`

---

## 16. Agent Coding Rules

> These rules apply to every file the agent creates or modifies in this project.
> Cross-reference with `.github/copilot-instructions.md` which mirrors the most critical rules.

1. **ES Modules only.** Use `import`/`export`. Never use `require()`.
2. **Async/await only.** Never use raw `.then()`/`.catch()` chains in application code.
3. **All async route handlers must be wrapped in `asyncHandler`.**
4. **Never hardcode any value** that could vary by environment. All config comes from `src/config/env.js`.
5. **Never access `req.body` directly in a route** without first passing through the `validate` middleware with a Zod schema.
6. **All business logic lives in the service layer.** Controllers only translate HTTP to/from service calls.
7. **Follow the error response shape** defined in Section 12 exactly — no improvisation.
8. **Every new module must be registered** in `src/routes/index.js`.
9. **No `console.log` anywhere.** Use the Winston logger from `utils/logger.js`.
10. **Mongoose model files export only the model** — no helper functions, no business logic.
11. **Run `npm test` before declaring a task complete.** If tests fail, fix before moving on.
12. **When in doubt about a design decision, stop and ask** rather than making assumptions.

---

## 17. Service Resiliency & Outage Management

> Goal: the system must degrade gracefully when a dependency is unavailable, never silently corrupt data, and always tell the caller what is happening.

---

### 17.1 Health Check Endpoints

Every service module exposes a dedicated health route. These are the only routes that bypass JWT authentication.

| Route | Handler file | Success response |
|---|---|---|
| `GET /api/v1/notebooks/health` | `notebooks/routes/health.js` | `200 { status: "ok", service: "notebooks" }` |
| `GET /api/v1/notes/health` | `notes/routes/health.js` | `200 { status: "ok", service: "notes" }` |

Each health handler must also verify the MongoDB connection is reachable before returning `200`. If the database is not connected, return `503 { status: "degraded", reason: "database unavailable" }`.

Use `mongoose.connection.readyState` to check the connection:

```js
// Example health check handler (notebooks)
const healthCheck = (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  if (dbState !== 1) {
    return res.status(503).json({ status: 'degraded', service: 'notebooks', reason: 'database unavailable' });
  }
  res.status(200).json({ status: 'ok', service: 'notebooks' });
};
```

---

### 17.2 Notes ↔ Notebooks Inter-Service Resiliency

The Notes service optionally enriches a note with notebook metadata at write time. This must **never block** note creation.

#### Behaviour contract

| Notebooks service state | Expected Notes service behaviour |
|---|---|
| Up and healthy | Validate `notebookId` exists before saving the note. Return `404` if the notebook is not found. |
| Down / unreachable / returns `5xx` | Save the note with the supplied `notebookId` as a plain string reference (unvalidated). Log a `warn`-level event. Do **not** return an error to the caller. |
| `notebookId` not supplied | Reject with `422 Validation failed` — `notebookId` is required. |

#### Implementation pattern

```js
// notes.service.js — checking notebooks availability
import { checkNotebookExists } from '../utils/notebooksClient.js';

export const createNote = async (payload) => {
  let notebookVerified = false;
  try {
    notebookVerified = await checkNotebookExists(payload.notebookId);
    if (!notebookVerified) {
      throw new ApiError(404, `Notebook ${payload.notebookId} not found`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err; // propagate intentional 404
    // Notebooks service is unavailable — degrade gracefully
    logger.warn('Notebooks service unreachable; saving note with unverified notebookId', {
      notebookId: payload.notebookId,
      error: err.message,
    });
  }
  return Note.create(payload);
};
```

The `checkNotebookExists` utility reads the target base URL from the `NOTEBOOKS_SERVICE_URL` environment variable (validated in `src/config/env.js`). When running via the root compose, Docker DNS resolves `notebooks-api` automatically over `app-network`. When running `notes-service` standalone, override `NOTEBOOKS_SERVICE_URL` in `.env` to point to a running `notebooks-api` instance or a mock server.

The utility must also have a **hard timeout** (default `3 000 ms`) so a slow notebooks service cannot stall a notes request indefinitely. Use `AbortSignal.timeout(3000)` or an `axios` timeout option.

---

### 17.3 MongoDB Connection Resilience

#### Startup behaviour

- If the initial connection fails, the process must **exit with code 1** (already specified in §8).
- Do not start `app.listen()` until the database is connected.

#### Runtime reconnection

Mongoose buffers operations automatically while reconnecting; no manual retry logic is needed for queries. However the application must respond to connection lifecycle events:

```js
// config/database.js
mongoose.connection.on('disconnected', () =>
  logger.warn('MongoDB disconnected — Mongoose will attempt to reconnect')
);
mongoose.connection.on('reconnected', () =>
  logger.info('MongoDB reconnected')
);
mongoose.connection.on('error', (err) =>
  logger.error('MongoDB connection error', { error: err.message })
);
```

#### Required Mongoose connection options

```js
await mongoose.connect(env.MONGO_URI, {
  dbName:              env.MONGO_DB_NAME,
  serverSelectionTimeoutMS: 5000,   // fail fast at startup
  socketTimeoutMS:          45000,  // drop idle sockets
  maxPoolSize:              10,
});
```

---

### 17.4 Graceful Shutdown

`server.js` must handle `SIGTERM` and `SIGINT` (already required by §7). The shutdown sequence must follow this exact order to avoid dropping in-flight requests:

1. **Stop accepting new connections** — call `server.close()`.
2. **Wait for in-flight requests to finish** — resolve inside the `server.close()` callback.
3. **Close the MongoDB connection** — call `mongoose.connection.close()`.
4. **Exit cleanly** — `process.exit(0)` on success, `process.exit(1)` on error.

```js
// server.js — graceful shutdown handler
const shutdown = async (signal) => {
  logger.info(`${signal} received — starting graceful shutdown`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force exit if shutdown takes longer than 10 s
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
```

---

### 17.5 Docker Compose Health Checks

Health checks are distributed across the three compose files. Each API service checks its own health endpoint; each MongoDB checks `ping`.

**`notebooks-service/compose.yaml`** additions:

```yaml
services:
  notebooks-api:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/notebooks/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    depends_on:
      notebooks-mongodb:
        condition: service_healthy

  notebooks-mongodb:
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

**`notes-service/compose.yaml`** additions:

```yaml
services:
  notes-api:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/notes/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    depends_on:
      notes-mongodb:
        condition: service_healthy

  notes-mongodb:
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

**Root `compose.yaml`** — `nginx` waits for both API services:

```yaml
services:
  nginx:
    depends_on:
      notebooks-api:
        condition: service_healthy
      notes-api:
        condition: service_healthy
```

**Rule:** `nginx` must not start until both API services are healthy; each API service must not start until its own MongoDB is healthy.

---

### 17.6 nginx Upstream Resiliency

Add the following directives to both upstream blocks and each location block to handle a slow or temporarily unavailable API container:

```nginx
upstream notebooks_api {
    server notebooks-api:3000;
    # Stop routing to this backend for 30 s after 3 consecutive failures
    max_fails    3;
    fail_timeout 30s;
}

upstream notes_api {
    server notes-api:3000;
    max_fails    3;
    fail_timeout 30s;
}

# Inside each location block:
proxy_next_upstream       error timeout http_502 http_503 http_504;
proxy_next_upstream_tries 2;
```

The timeout values defined in §5 (`proxy_connect_timeout 60s` etc.) remain in force.

---

### 17.7 Error Response Codes for Resiliency Scenarios

These status codes extend the table in §9 and must be handled by the global error handler (§12):

| Scenario | Status | `error.message` |
|---|---|---|
| Database unavailable at health check | `503` | `"Service temporarily unavailable"` |
| Upstream dependency timeout (notebooks → notes) | `504` | `"Upstream service timed out"` |
| Graceful degradation active (notebooks down, note saved unverified) | `201` | *(normal success — degradation is internal only, logged as `warn`)* |

---

### 17.8 Resiliency Checklist (agent must verify before marking any task complete)

- [ ] Both `/health` endpoints return `200` when DB is connected and `503` when it is not
- [ ] Note creation succeeds even when the Notebooks service is unreachable
- [ ] A `warn` log entry is emitted when note is saved with an unverified `notebookId`
- [ ] `checkNotebookExists` times out within ≤ 3 s
- [ ] Graceful shutdown completes within 10 s and exits with code `0`
- [ ] Docker health checks are defined for `notebooks-api`, `notebooks-mongodb`, `notes-api`, and `notes-mongodb`
- [ ] `nginx` `max_fails` / `fail_timeout` directives are present
- [ ] No `500` is returned to the caller for a recoverable dependency failure

---

*End of Technical Specification*
