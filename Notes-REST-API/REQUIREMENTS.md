# Requirements — Notes REST API

> **Version:** 1.0.0
> **Last Updated:** 2026-02-26
> **Status:** Draft
> **Owner:** Dejan Music
> **Cross-reference:** [SPEC.md](SPEC.md) — all implementation decisions (response shapes, status codes, auth, error handling) are governed by the spec.

---

## Table of Contents

1. [Scope & Services](#1-scope--services)
2. [General API Requirements](#2-general-api-requirements)
3. [Notebooks Service Requirements](#3-notebooks-service-requirements)
   - 3.1 [Data Model](#31-data-model)
   - 3.2 [Endpoints](#32-endpoints)
   - 3.3 [Validation Rules](#33-validation-rules)
   - 3.4 [Business Rules](#34-business-rules)
4. [Notes Service Requirements](#4-notes-service-requirements)
   - 4.1 [Data Model](#41-data-model)
   - 4.2 [Endpoints](#42-endpoints)
   - 4.3 [Validation Rules](#43-validation-rules)
   - 4.4 [Business Rules](#44-business-rules)
5. [Cross-Service Requirements](#5-cross-service-requirements)
6. [Authentication Requirements](#6-authentication-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)

---

## 1. Scope & Services

The system is composed of two independent services, each deployed as a separate Docker Compose project and integrated via the root compose using the `include` directive (see SPEC.md §4):

| Service | Base URL prefix | Compose project |
|---|---|---|
| **notebooks-service** | `/api/v1/notebooks` | `notebooks-service/` |
| **notes-service** | `/api/v1/notes` | `notes-service/` |

All traffic reaches services through the nginx reverse proxy. Neither service exposes its port directly to the host.

---

## 2. General API Requirements

- All endpoints are prefixed with `/api/v1/`.
- All request and response bodies use JSON (`Content-Type: application/json`).
- All list endpoints return an array, even when empty (`[]`).
- All responses follow the standard success/error shapes defined in SPEC.md §9 and §12.
- All endpoints except `/health` and auth routes (`POST /auth/register`, `POST /auth/login`) require a valid JWT Bearer token.
- Pagination applies to all list endpoints: default `?page=1&limit=20`, maximum `limit` is 100.
- All timestamps (`createdAt`, `updatedAt`) are in ISO 8601 format.
- MongoDB `_id` is never exposed; the `id` virtual field (string) is used instead.

---

## 3. Notebooks Service Requirements

### 3.1 Data Model

A **Notebook** document must contain the following fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | — | Derived from MongoDB `_id`; read-only; exposed via JSON transform |
| `name` | `string` | Yes | Non-empty; trimmed |
| `description` | `string` | No | Optional free-text; trimmed if provided |
| `createdAt` | `Date` | — | Set automatically by Mongoose `timestamps: true` |
| `updatedAt` | `Date` | — | Set automatically by Mongoose `timestamps: true` |

### 3.2 Endpoints

#### `POST /api/v1/notebooks` — Create a notebook

| Attribute | Value |
|---|---|
| Auth required | Yes |
| Request body | `{ "name": string (required), "description": string (optional) }` |
| Success response | `201` — returns the created notebook object wrapped in `{ "success": true, "data": { ... } }` |
| Error — missing `name` | `422` — validation error |
| Error — request body missing/malformed | `400` |

---

#### `GET /api/v1/notebooks` — List all notebooks

| Attribute | Value |
|---|---|
| Auth required | Yes |
| Query params | `?page=1&limit=20` |
| Success response | `200` — returns `{ "success": true, "data": [ ... ], "pagination": { ... } }` |

---

#### `GET /api/v1/notebooks/:id` — Get a single notebook

| Attribute | Value |
|---|---|
| Auth required | Yes |
| URL param | `:id` — MongoDB ObjectId string |
| Success response | `200` — returns `{ "success": true, "data": { ... } }` |
| Error — notebook not found | `404` |
| Error — malformed `:id` | `422` |

---

#### `PUT /api/v1/notebooks/:id` — Update a notebook

| Attribute | Value |
|---|---|
| Auth required | Yes |
| URL param | `:id` — MongoDB ObjectId string |
| Request body | `{ "name": string (optional), "description": string (optional) }` — at least one field must be provided |
| Success response | `200` — returns the updated notebook object |
| Error — notebook not found | `404` |
| Error — no updatable fields provided | `422` |
| Error — malformed `:id` | `422` |

---

#### `DELETE /api/v1/notebooks/:id` — Delete a notebook

| Attribute | Value |
|---|---|
| Auth required | Yes |
| URL param | `:id` — MongoDB ObjectId string |
| Success response | `204` — no response body |
| Error — notebook not found | `404` |
| Error — malformed `:id` | `422` |

> **Cascade rule:** Deleting a notebook does **not** automatically delete its associated notes. Notes referencing the deleted `notebookId` remain in the notes-service database. This is a deliberate design choice; orphan cleanup is out of scope for v1.

---

#### `GET /health` — Notebooks service health check

| Attribute | Value |
|---|---|
| Auth required | **No** |
| Success response | `200` — `{ "status": "ok", "service": "notebooks" }` |
| Degraded response | `503` — `{ "status": "degraded", "service": "notebooks", "reason": "database unavailable" }` when MongoDB is not connected |

The health route is available at both `/health` (internal, for Docker health checks) and `/api/v1/notebooks/health` (routed through nginx).

---

### 3.3 Validation Rules

| Field | Rule |
|---|---|
| `name` | Required on `POST`. Must be a non-empty string after trimming. Min length: 1 character, max length: 200 characters. |
| `description` | Optional. If provided, must be a string. Max length: 1000 characters. |
| `:id` param | Must be a valid MongoDB ObjectId string (24 hex characters). Return `422` if not. |

All validation is performed by the Zod schema in `notebooks.schema.js` via the `validate` middleware before the controller is reached.

### 3.4 Business Rules

- A notebook `name` is **not** required to be unique.
- A notebook cannot be created with an empty string `name` (even if the field is present in the body).
- `PUT` is a **partial update** in practice — only fields present in the request body are updated (i.e., behaves like `PATCH`). The endpoint is named `PUT` for API consumer simplicity.
- The `id`, `createdAt`, and `updatedAt` fields are **read-only** and must be ignored if provided in the request body.

---

## 4. Notes Service Requirements

### 4.1 Data Model

A **Note** document must contain the following fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | — | Derived from MongoDB `_id`; read-only |
| `title` | `string` | Yes | Non-empty; trimmed |
| `content` | `string` | Yes | Body text of the note; required |
| `notebookId` | `string` | No | Optional reference to a Notebook `id`; validated against notebooks-service when provided and when service is available |
| `createdAt` | `Date` | — | Automatic |
| `updatedAt` | `Date` | — | Automatic |

### 4.2 Endpoints

#### `POST /api/v1/notes` — Create a note

| Attribute | Value |
|---|---|
| Auth required | Yes |
| Request body | `{ "title": string (required), "content": string (required), "notebookId": string (optional) }` |
| Success response | `201` — returns the created note object |
| Error — missing `title` or `content` | `400` |
| Error — `notebookId` provided and references a non-existent notebook (when notebooks-service is reachable) | `404` |
| Degraded — `notebookId` provided but notebooks-service unreachable | `201` — note is saved with unverified `notebookId`; `warn` log emitted (see SPEC.md §17.2) |

---

#### `GET /api/v1/notes` — List all notes

| Attribute | Value |
|---|---|
| Auth required | Yes |
| Query params | `?page=1&limit=20`, optionally `?notebookId=<id>` to filter by notebook |
| Success response | `200` — returns paginated list |

---

#### `GET /api/v1/notes/:id` — Get a single note

| Attribute | Value |
|---|---|
| Auth required | Yes |
| Success response | `200` |
| Error — not found | `404` |
| Error — malformed `:id` | `422` |

---

#### `PUT /api/v1/notes/:id` — Update a note

| Attribute | Value |
|---|---|
| Auth required | Yes |
| Request body | `{ "title": string (optional), "content": string (optional) }` — `notebookId` cannot be changed after creation |
| Success response | `200` — returns updated note |
| Error — not found | `404` |
| Error — no updatable fields | `422` |

---

#### `DELETE /api/v1/notes/:id` — Delete a note

| Attribute | Value |
|---|---|
| Auth required | Yes |
| Success response | `204` — no body |
| Error — not found | `404` |

---

#### `GET /health` — Notes service health check

| Attribute | Value |
|---|---|
| Auth required | **No** |
| Success response | `200` — plain text body: `up` |
| Degraded response | `503` — plain text body: `down` (when MongoDB is not connected) |

### 4.3 Validation Rules

| Field | Rule |
|---|---|
| `title` | Required on `POST`. Non-empty string after trimming. Max length: 300 characters. Returns `400` if missing. |
| `content` | Required on `POST`. String. Max length: 50 000 characters. Returns `400` if missing. |
| `notebookId` | Optional on `POST`. If provided, must be a valid MongoDB ObjectId string. Cannot be changed via `PUT`. |
| `:id` param | Must be a valid MongoDB ObjectId string. Return `422` if not. |

### 4.4 Business Rules

- `notebookId` is **optional**; a note can exist independently without belonging to a notebook.
- If `notebookId` is provided, it is immutable after creation — it cannot be changed via `PUT`.
- When `notebookId` is provided and the notebooks-service is reachable, the ID must be validated to exist before the note is saved. A non-existent `notebookId` returns `404`.
- When `notebookId` is provided and the notebooks-service is unreachable, the note is saved with the unverified `notebookId` (graceful degradation). No error is returned to the caller.
- `notebookId` is stored as a plain string reference — there is no Mongoose `ref` or populate across services.

---

## 5. Cross-Service Requirements

| Requirement | Detail |
|---|---|
| **Notebook existence check** | When creating a note **and `notebookId` is provided**, `notes-service` calls `GET /api/v1/notebooks/:notebookId/` on `notebooks-service` to verify the notebook exists. If `notebookId` is not provided, no cross-service call is made. |
| **Timeout** | The cross-service call must complete within **3 000 ms**. If it times out, the note is saved with the unverified `notebookId` and a `warn` log is emitted. |
| **Service URL** | Resolved from `NOTEBOOKS_SERVICE_URL` environment variable (default: `http://notebooks-api:3000` when running in the integrated compose stack). |
| **No circular dependency** | `notebooks-service` must **never** call `notes-service`. The dependency is one-directional: notes → notebooks. |
| **No shared database** | Each service has its own MongoDB instance. Cross-service data access only happens over HTTP. |

---

## 6. Authentication Requirements

- Authentication is implemented using **JWT Bearer tokens** (see SPEC.md §10).
- Registration: `POST /api/v1/auth/register` — creates a new user account.
- Login: `POST /api/v1/auth/login` — returns a signed JWT.
- All other endpoints require a valid JWT in the `Authorization: Bearer <token>` header.
- Tokens expire after `JWT_EXPIRES_IN` (default `7d`).
- An expired or invalid token returns `401`.
- Passwords are hashed with bcrypt (minimum 12 rounds). Plain-text passwords are never stored or logged.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | API responses (excluding DB cold start) must complete within 500 ms under normal load. |
| **Availability** | Each service degrades gracefully on dependency failure (see SPEC.md §17). |
| **Security** | All security controls listed in SPEC.md §15 must be implemented (helmet, rate limiting, CORS, body size limit, JWT secret length enforcement). |
| **Observability** | All events listed in SPEC.md §13 logging table must be logged at the correct level. No passwords or JWT secrets may appear in logs. |
| **Testability** | Every endpoint must have Jest + Supertest tests covering happy path, validation failure, auth failure, and not-found cases (see SPEC.md §14). |
| **Portability** | The full stack must start with a single `docker compose up --build` from the project root with no manual pre-steps beyond creating `.env` files from `.env.example`. |
| **Graceful shutdown** | Both services must shut down cleanly within 10 s on `SIGTERM`/`SIGINT` (see SPEC.md §17.4). |

---

*End of Requirements*
