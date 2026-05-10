# Tasks — Notes REST API

> **Version:** 1.0.0
> **Last Updated:** 2026-02-26
> **Status:** Draft
> **Cross-reference:** [SPEC.md](SPEC.md) · [REQUIREMENTS.md](REQUIREMENTS.md)

Each task is **self-contained and independently verifiable**. Complete tasks in order within each group; groups marked ✦ can be started in parallel once their stated prerequisites are done.

**Completion criteria for every task:** code written → `npm test` passes → checklist ticked.

---

## Table of Contents

1. [Group A — Project Scaffolding](#group-a--project-scaffolding)
2. [Group B — notebooks-service Core](#group-b--notebooks-service-core)
3. [Group C — notes-service Core](#group-c--notes-service-core)
4. [Group D — Cross-Service Integration](#group-d--cross-service-integration)
5. [Group E — Authentication](#group-e--authentication)
6. [Group F — Docker & Infrastructure](#group-f--docker--infrastructure)
7. [Group G — nginx](#group-g--nginx)
8. [Group H — Testing](#group-h--testing)
9. [Group I — Resiliency & Observability](#group-i--resiliency--observability)

---

## Group A — Project Scaffolding

> **Prerequisite:** None. Start here.

---

### TASK-A1 · Initialise `notebooks-service` project

**Goal:** A runnable Express skeleton exists for the notebooks service.

**Files to create:**
- `notebooks-service/api/package.json`
- `notebooks-service/api/src/app.js`
- `notebooks-service/api/src/server.js`
- `notebooks-service/api/src/config/env.js`
- `notebooks-service/api/src/config/database.js`
- `notebooks-service/api/src/middleware/notFound.js`
- `notebooks-service/api/src/middleware/errorHandler.js`
- `notebooks-service/api/src/utils/logger.js`
- `notebooks-service/api/src/utils/asyncHandler.js`
- `notebooks-service/api/src/utils/ApiError.js`
- `notebooks-service/api/src/routes/index.js`
- `notebooks-service/.env.example`

**Spec references:** §2 (tech stack), §3 (directory structure), §7 (app architecture), §8 (DB connection), §12 (ApiError), §13 (logging), §16 (coding rules)

**Verification checklist:**
- [ ] `"type": "module"` is set in `package.json`; no `require()` anywhere
- [ ] All env variables in `.env.example` are validated by Zod in `env.js` at startup; missing variable causes `process.exit(1)` with a clear message
- [ ] `app.js` exports the Express app and does **not** call `app.listen()`
- [ ] `server.js` connects to MongoDB before calling `app.listen()`; fails fast with exit code `1` on connection error
- [ ] `ApiError` class has `statusCode`, `message`, `details`, `isOperational` fields
- [ ] Winston logger outputs colorised text in `development`, JSON in `production`/`test`
- [ ] `asyncHandler` wraps a function and forwards errors to `next`
- [ ] `notFound` handler returns `404` with the standard error shape
- [ ] `errorHandler` handles `ApiError`, Mongoose `ValidationError`, duplicate key `11000`, JWT errors, and generic `500`

---

### TASK-A2 · Initialise `notes-service` project

**Goal:** A runnable Express skeleton exists for the notes service.

**Files to create:** Same structure as TASK-A1 under `notes-service/`, plus:
- `notes-service/api/src/utils/notebooksClient.js`

**Additional env variable (notes-service only):**
- `NOTEBOOKS_SERVICE_URL` — optional, defaults to `http://notebooks-api:3000`

**Spec references:** Same as TASK-A1 plus §17.2 (`notebooksClient`)

**Verification checklist:**
- [ ] All TASK-A1 checklist items satisfied for `notes-service`
- [ ] `notebooksClient.js` exports a `checkNotebookExists(notebookId)` function
- [ ] `checkNotebookExists` reads base URL from `NOTEBOOKS_SERVICE_URL` env var
- [ ] `checkNotebookExists` has a hard 3 000 ms timeout using `AbortSignal.timeout(3000)` or equivalent
- [ ] Function returns `true` when notebook exists, `false` when `404`, throws on other network errors

---

### TASK-A3 · Apply global middleware stack to both services

**Goal:** All middleware described in SPEC.md §11 is wired up in `app.js` in the correct order.

**Packages to install (both services):** `express`, `cors`, `morgan`, `helmet`, `express-rate-limit`

**Spec references:** §11 (middleware order), §15 (security baseline)

**Verification checklist:**
- [ ] Middleware applied in exact order: `morgan` → `cors` → `express-rate-limit` → `helmet` → `express.json({ limit: '10kb' })` → `express.urlencoded({ extended: true })` → routes → `notFound` → `errorHandler`
- [ ] `morgan` is skipped when `NODE_ENV=test`
- [ ] `cors` is configured from `CORS_ORIGIN` env variable
- [ ] Rate limiter uses `RATE_LIMIT_WINDOW` and `RATE_LIMIT_MAX`
- [ ] `app.set('trust proxy', 1)` is set
- [ ] `express.json` body limit is `10kb`

---

## Group B — notebooks-service Core

> **Prerequisite:** TASK-A1, TASK-A3 complete.

---

### TASK-B1 · Notebook Mongoose model

**Goal:** The `Notebook` Mongoose schema and model are defined correctly.

**Files to create:**
- `notebooks-service/api/src/modules/notebooks/notebooks.model.js`

**Spec references:** §8 (DB design, schema transform, naming conventions), REQUIREMENTS §3.1

**Verification checklist:**
- [ ] Schema has fields: `name` (String, required, trim), `description` (String, optional, trim)
- [ ] `timestamps: true` is set
- [ ] `toJSON` transform: exposes `id` (string), removes `_id` and `__v`
- [ ] `strictQuery: true` is set globally before `mongoose.connect()`
- [ ] Model file exports only the model — no helper functions

---

### TASK-B2 · Notebook Zod validation schemas

**Goal:** Zod schemas validate all incoming notebook request shapes.

**Files to create:**
- `notebooks-service/api/src/modules/notebooks/notebooks.schema.js`

**Spec references:** §9 (validation), REQUIREMENTS §3.3

**Verification checklist:**
- [ ] `createNotebookSchema` — `name` required non-empty string (max 200), `description` optional string (max 1000)
- [ ] `updateNotebookSchema` — both fields optional; schema-level refinement ensures at least one field is present
- [ ] `notebookIdParamSchema` — validates `:id` is a 24-character hex string
- [ ] `paginationSchema` — validates `page` (default 1) and `limit` (default 20, max 100)
- [ ] No business logic in schema file

---

### TASK-B3 · Notebook service layer

**Goal:** All notebook business logic is implemented in the service layer.

**Files to create:**
- `notebooks-service/api/src/modules/notebooks/notebooks.service.js`

**Spec references:** §7 (layered architecture), §8, §9, REQUIREMENTS §3.2–§3.4

**Verification checklist:**
- [ ] `createNotebook(data)` — saves and returns new notebook
- [ ] `listNotebooks({ page, limit })` — returns `{ data, pagination: { total, page, limit, pages } }`
- [ ] `getNotebookById(id)` — returns notebook or throws `ApiError(404, ...)`
- [ ] `updateNotebook(id, data)` — returns updated notebook or throws `ApiError(404, ...)`
- [ ] `deleteNotebook(id)` — deletes or throws `ApiError(404, ...)`
- [ ] No `req`/`res` references anywhere in this file
- [ ] All functions are `async`

---

### TASK-B4 · Notebook controller

**Goal:** The controller extracts HTTP data and delegates to the service.

**Files to create:**
- `notebooks-service/api/src/modules/notebooks/notebooks.controller.js`

**Spec references:** §7, §9 (response shapes)

**Verification checklist:**
- [ ] Each handler uses `asyncHandler` wrapper
- [ ] Calls the corresponding service function; wraps result in `{ success: true, data: ... }`
- [ ] `createNotebook` responds `201`, `listNotebooks` responds `200`, `getNotebook` responds `200`, `updateNotebook` responds `200`, `deleteNotebook` responds `204` with no body
- [ ] No business logic — only `req` extraction and `res` serialisation

---

### TASK-B5 · Notebook routes & registration

**Goal:** All notebook endpoints are reachable and protected.

**Files to create:**
- `notebooks-service/api/src/modules/notebooks/notebooks.routes.js`

**Files to modify:**
- `notebooks-service/api/src/routes/index.js`

**Spec references:** §9 (base URL `/api/v1/`), §10 (auth middleware), REQUIREMENTS §3.2

**Verification checklist:**
- [ ] Routes: `POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /health`
- [ ] All routes except `GET /health` apply `auth` middleware
- [ ] `validate` middleware applied with correct schema on `POST` and `PUT`
- [ ] `notebookIdParamSchema` validation applied on routes with `:id`
- [ ] Router mounted at `/api/v1/notebooks` in `routes/index.js`
- [ ] Health route returns `200 { status: 'ok', service: 'notebooks' }` when DB connected; `503` when not

---

## Group C — notes-service Core ✦

> **Prerequisite:** TASK-A2, TASK-A3 complete. Can run in parallel with Group B.

---

### TASK-C1 · Note Mongoose model

**Goal:** The `Note` Mongoose schema and model are defined correctly.

**Files to create:**
- `notes-service/api/src/modules/notes/notes.model.js`

**Spec references:** §8, REQUIREMENTS §4.1

**Verification checklist:**
- [ ] Schema has fields: `title` (String, required, trim), `content` (String, required), `notebookId` (String, optional)
- [ ] `timestamps: true` and `toJSON` transform (same as TASK-B1 pattern)
- [ ] `notebookId` stored as plain String — no Mongoose `ref`
- [ ] Model exports only the model

---

### TASK-C2 · Note Zod validation schemas

**Files to create:**
- `notes-service/api/src/modules/notes/notes.schema.js`

**Spec references:** §9, REQUIREMENTS §4.3

**Verification checklist:**
- [ ] `createNoteSchema` — `title` required (max 300), `content` required (max 50 000), `notebookId` optional valid ObjectId string; missing `title` or `content` produces validation error mapped to `400`
- [ ] `updateNoteSchema` — `title` optional, `content` optional; `notebookId` field **must not be accepted** (stripped or rejected); at least one field required
- [ ] `noteIdParamSchema` — validates `:id` as 24-char hex string
- [ ] `paginationSchema` — same as notebooks version; adds optional `notebookId` query filter

---

### TASK-C3 · Note service layer

**Files to create:**
- `notes-service/api/src/modules/notes/notes.service.js`

**Spec references:** §7, §17.2, REQUIREMENTS §4.2–§4.4

**Verification checklist:**
- [ ] `createNote(data)` — if `notebookId` present: calls `checkNotebookExists`; throws `ApiError(404)` if not found; degrades gracefully (saves anyway + `warn` log) if service unreachable
- [ ] `listNotes({ page, limit, notebookId })` — supports optional `notebookId` filter
- [ ] `getNoteById(id)` — returns note or `ApiError(404)`
- [ ] `updateNote(id, data)` — `notebookId` never updated regardless of input; returns updated note or `ApiError(404)`
- [ ] `deleteNote(id)` — deletes or `ApiError(404)`
- [ ] No `req`/`res` in file

---

### TASK-C4 · Note controller

**Files to create:**
- `notes-service/api/src/modules/notes/notes.controller.js`

**Verification checklist:** Same pattern as TASK-B4 for notes endpoints. `createNote` → `201`, others as per REQUIREMENTS §4.2.

---

### TASK-C5 · Note routes & registration

**Files to create:**
- `notes-service/api/src/modules/notes/notes.routes.js`

**Files to modify:**
- `notes-service/api/src/routes/index.js`

**Spec references:** §9, §10, REQUIREMENTS §4.2

**Verification checklist:**
- [ ] Routes: `POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /health`
- [ ] All routes except `GET /health` apply `auth` middleware
- [ ] `POST /` uses `createNoteSchema`; `PUT /:id` uses `updateNoteSchema`
- [ ] Health route returns `200` with plain text `up`; `503` with `down` when DB disconnected
- [ ] Router mounted at `/api/v1/notes` in `routes/index.js`

---

## Group D — Cross-Service Integration

> **Prerequisite:** TASK-B5 and TASK-C5 complete.

---

### TASK-D1 · `notebooksClient` implementation

**Goal:** The notes-service HTTP client for calling notebooks-service is complete and resilient.

**Files to modify:**
- `notes-service/api/src/utils/notebooksClient.js`

**Spec references:** §17.2, REQUIREMENTS §5

**Verification checklist:**
- [ ] `checkNotebookExists(notebookId)` builds URL from `NOTEBOOKS_SERVICE_URL` env var
- [ ] Uses `AbortSignal.timeout(3000)` (or axios `timeout: 3000`) — never waits more than 3 s
- [ ] Returns `true` if response is `200`; returns `false` if response is `404`
- [ ] Throws a non-`ApiError` error for any other failure (caller handles graceful degradation)
- [ ] No direct DB access — HTTP only
- [ ] Unit-testable: base URL is injectable via env; `fetch`/`axios` can be mocked

---

## Group E — Authentication

> **Prerequisite:** TASK-A1 and TASK-A2 complete. Can run in parallel with Groups B and C.

---

### TASK-E1 · User model (both services)

**Goal:** A `User` model exists in each service to support JWT auth.

**Files to create (repeat for both services):**
- `<service>/api/src/modules/auth/user.model.js`

**Spec references:** §10 (password rules), §8 (schema conventions)

**Verification checklist:**
- [ ] Schema fields: `email` (String, required, unique, lowercase, trim), `password` (String, required), `role` (String, enum `['user', 'admin']`, default `'user'`)
- [ ] `timestamps: true` and `toJSON` transform applied
- [ ] `password` field has `select: false` so it is never returned in queries by default
- [ ] No bcrypt logic in the model file

---

### TASK-E2 · Auth service, controller & routes (both services)

**Goal:** Register and login endpoints are functional in both services.

**Files to create (repeat for both services):**
- `<service>/api/src/modules/auth/auth.service.js`
- `<service>/api/src/modules/auth/auth.controller.js`
- `<service>/api/src/modules/auth/auth.routes.js`
- `<service>/api/src/modules/auth/auth.schema.js`

**Files to modify:**
- `<service>/api/src/routes/index.js` — mount at `/api/v1/auth`

**Spec references:** §10

**Verification checklist:**
- [ ] `POST /api/v1/auth/register` — hashes password with bcrypt (min 12 rounds), saves user, returns `201` with JWT
- [ ] `POST /api/v1/auth/login` — compares password with bcrypt, returns `200` with JWT on success, `401` on failure
- [ ] JWT payload contains `{ sub, email, role, iat, exp }` (SPEC §10)
- [ ] Plain-text password is never stored, never returned, never logged
- [ ] Auth routes are **public** (no `auth` middleware applied)

---

### TASK-E3 · JWT auth middleware (both services)

**Files to create (repeat for both services):**
- `<service>/api/src/middleware/auth.js`

**Spec references:** §10, §12 (JWT error handling)

**Verification checklist:**
- [ ] Reads token from `Authorization: Bearer <token>` header
- [ ] Missing token → `ApiError(401, 'Authentication required')`
- [ ] Invalid token (`JsonWebTokenError`) → `ApiError(401, 'Invalid token')`
- [ ] Expired token (`TokenExpiredError`) → `ApiError(401, 'Token expired')`
- [ ] Valid token → attaches decoded payload to `req.user` and calls `next()`
- [ ] `requireAdmin` middleware exported from same file: checks `req.user.role === 'admin'`, throws `ApiError(403)` otherwise

---

## Group F — Docker & Infrastructure

> **Prerequisite:** TASK-A1, TASK-A2 complete.

---

### TASK-F1 · `notebooks-service` Dockerfile

**Files to create:**
- `notebooks-service/api/Dockerfile`

**Spec references:** §3, §4

**Verification checklist:**
- [ ] Multi-stage build: `deps` stage installs production dependencies; `runner` stage copies only `node_modules` + `src`
- [ ] Base image: `node:20-alpine`
- [ ] `NODE_ENV=production` set in runner stage
- [ ] Runs as non-root user (`node`)
- [ ] `EXPOSE 3000`
- [ ] `CMD ["node", "src/server.js"]`
- [ ] No `.env` file copied into image — env injected at runtime

---

### TASK-F2 · `notes-service` Dockerfile ✦

**Files to create:**
- `notes-service/api/Dockerfile`

**Verification checklist:** Same as TASK-F1 for `notes-service`.

---

### TASK-F3 · `notebooks-service/compose.yaml`

**Goal:** Notebooks service and its MongoDB run in isolation.

**Files to create:**
- `notebooks-service/compose.yaml`

**Spec references:** §4 (compose structure)

**Verification checklist:**
- [ ] Services: `notebooks-api` and `notebooks-mongodb`
- [ ] `notebooks-api` depends on `notebooks-mongodb` with `condition: service_healthy`
- [ ] `notebooks-mongodb` has `healthcheck` using `mongosh --eval "db.adminCommand('ping')"`
- [ ] `notebooks-api` has `healthcheck` hitting `http://localhost:3000/api/v1/notebooks/health`
- [ ] Both services on `notebooks-network` (bridge); no `app-network` here
- [ ] `notebooks-mongo-data` volume declared
- [ ] Port 3000 **not** exposed to host
- [ ] `docker compose up` from `notebooks-service/` starts the service successfully

---

### TASK-F4 · `notes-service/compose.yaml` ✦

**Files to create:**
- `notes-service/compose.yaml`

**Verification checklist:** Same pattern as TASK-F3, substituting `notes-*` names throughout.

---

### TASK-F5 · Root `compose.yaml` (integration stack)

**Goal:** `docker compose up --build` from the project root starts the full integrated stack.

**Files to create:**
- `compose.yaml` (project root)

**Spec references:** §4 (include directive, app-network, NOTEBOOKS_SERVICE_URL)

**Verification checklist:**
- [ ] Uses `include:` to pull in both service compose files
- [ ] Adds `nginx` service with `depends_on` both API services (`condition: service_healthy`)
- [ ] Extends `notebooks-api` and `notes-api` to also join `app-network`
- [ ] Injects `NOTEBOOKS_SERVICE_URL=http://notebooks-api:3000` into `notes-api`
- [ ] `app-network` bridge network defined at root level
- [ ] `notebooks-mongodb` and `notes-mongodb` are **not** on `app-network`
- [ ] Full stack starts cleanly: `docker compose up --build` → all containers healthy

---

## Group G — nginx

> **Prerequisite:** TASK-F5 complete.

---

### TASK-G1 · nginx configuration

**Files to create:**
- `nginx/nginx.conf`
- `nginx/conf.d/default.conf`

**Spec references:** §5

**Verification checklist:**
- [ ] Two upstream blocks: `notebooks_api` → `notebooks-api:3000`, `notes_api` → `notes-api:3000`
- [ ] Each upstream has `max_fails 3; fail_timeout 30s;`
- [ ] `location /api/v1/notebooks/` proxies to `notebooks_api`
- [ ] `location /api/v1/notes/` proxies to `notes_api`
- [ ] Unmatched paths return `404`
- [ ] All four proxy headers forwarded: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- [ ] All four security headers added: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`
- [ ] Timeouts: `proxy_connect_timeout 60s`, `proxy_send_timeout 60s`, `proxy_read_timeout 60s`
- [ ] `proxy_next_upstream error timeout http_502 http_503 http_504; proxy_next_upstream_tries 2;` in each location block
- [ ] `curl http://localhost/api/v1/notebooks/health` returns `200` through nginx

---

## Group H — Testing

> **Prerequisite:** Complete the group whose service is under test (Group B or C), plus TASK-E3.

---

### TASK-H1 · Test infrastructure setup (both services)

**Files to create (repeat for both services):**
- `<service>/api/tests/setup.js`
- `<service>/api/tests/teardown.js`

**Spec references:** §14

**Verification checklist:**
- [ ] `setup.js` connects to a test MongoDB (from `MONGO_URI` with `NODE_ENV=test`)
- [ ] `teardown.js` closes the Mongoose connection
- [ ] Jest config in `package.json`: `globalSetup`, `globalTeardown`, `testEnvironment: 'node'`
- [ ] `npm test` runs without error on a clean DB

---

### TASK-H2 · Notebooks endpoint tests

**Files to create:**
- `notebooks-service/api/tests/notebooks/notebooks.test.js`

**Spec references:** §14, REQUIREMENTS §3.2–§3.4

**Verification checklist:**
- [ ] `POST /api/v1/notebooks` — happy path returns `201` with created object
- [ ] `POST /api/v1/notebooks` — missing `name` returns `422`
- [ ] `POST /api/v1/notebooks` — no auth token returns `401`
- [ ] `GET /api/v1/notebooks` — returns `200` with array and pagination
- [ ] `GET /api/v1/notebooks/:id` — valid id returns `200`; unknown id returns `404`; malformed id returns `422`
- [ ] `PUT /api/v1/notebooks/:id` — happy path returns `200` with updated data; unknown id returns `404`
- [ ] `DELETE /api/v1/notebooks/:id` — happy path returns `204`; unknown id returns `404`
- [ ] `GET /api/v1/notebooks/health` — returns `200` without auth token

---

### TASK-H3 · Notes endpoint tests

**Files to create:**
- `notes-service/api/tests/notes/notes.test.js`

**Spec references:** §14, REQUIREMENTS §4.2–§4.4

**Verification checklist:**
- [ ] `POST /api/v1/notes` — happy path (no `notebookId`) returns `201`
- [ ] `POST /api/v1/notes` — missing `title` returns `400`; missing `content` returns `400`
- [ ] `POST /api/v1/notes` — no auth token returns `401`
- [ ] `POST /api/v1/notes` — `notebookId` provided, notebooks-service mocked as down → returns `201` (graceful degradation)
- [ ] `GET /api/v1/notes` — returns `200` with paginated array
- [ ] `GET /api/v1/notes?notebookId=<id>` — filters results correctly
- [ ] `GET /api/v1/notes/:id` — valid id returns `200`; unknown id returns `404`
- [ ] `PUT /api/v1/notes/:id` — happy path returns `200`; `notebookId` in body is ignored
- [ ] `DELETE /api/v1/notes/:id` — happy path returns `204`; unknown id returns `404`
- [ ] `GET /health` — returns `200` with plain text `up`

---

## Group I — Resiliency & Observability

> **Prerequisite:** Groups B, C, D complete.

---

### TASK-I1 · Graceful shutdown (both services)

**Files to modify:**
- `<service>/api/src/server.js`

**Spec references:** §7 (`server.js` responsibilities), §17.4

**Verification checklist:**
- [ ] `SIGTERM` and `SIGINT` handlers registered
- [ ] Shutdown sequence: `server.close()` → `mongoose.connection.close()` → `process.exit(0)`
- [ ] Force-exit `setTimeout` of 10 000 ms with `.unref()` to prevent hanging
- [ ] Error during shutdown logs at `error` level and exits with code `1`
- [ ] `logger.info('Graceful shutdown initiated')` logged on signal receipt

---

### TASK-I2 · MongoDB connection lifecycle logging (both services)

**Files to modify:**
- `<service>/api/src/config/database.js`

**Spec references:** §17.3, §13

**Verification checklist:**
- [ ] Mongoose connection options set: `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`, `maxPoolSize: 10`
- [ ] `disconnected` event → `logger.warn`
- [ ] `reconnected` event → `logger.info`
- [ ] `error` event → `logger.error` with error message
- [ ] All required events from SPEC §13 logging table are covered

---

### TASK-I3 · Resiliency self-check

**Goal:** Verify all items in the §17.8 checklist pass against the running integrated stack.

**Spec references:** §17.8

**Verification checklist:**
- [ ] `GET /api/v1/notebooks/health` → `200` when DB connected; `503` when DB stopped
- [ ] `GET /health` on notes-service → `200 up` when DB connected; `503 down` when DB stopped
- [ ] `POST /api/v1/notes` with `notebookId` succeeds when notebooks-service stopped (degradation)
- [ ] A `warn` log entry visible in notes-service output for the degraded creation
- [ ] Cross-service call times out within 3 s (verified by stopping notebooks-service and timing the notes `POST`)
- [ ] Graceful shutdown on `docker compose stop` completes in < 10 s and containers exit with code `0`
- [ ] nginx `max_fails` behaviour: after 3 failures nginx stops forwarding for 30 s (manual test)

---

*End of Tasks*
