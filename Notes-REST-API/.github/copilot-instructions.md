# GitHub Copilot — Agent Instructions
# Notes REST API

> These instructions apply to every file the agent creates or modifies in this repository.
> Full design decisions live in [SPEC.md](../SPEC.md).
> Endpoint contracts and business rules live in [REQUIREMENTS.md](../REQUIREMENTS.md).
> Task breakdown lives in [TASKS.md](../TASKS.md).
> **When any rule here conflicts with SPEC.md, SPEC.md wins.**

---

## 1. Files the Agent Must Never Touch

The agent must refuse to create, edit, rename, or delete any of the following:

| File / pattern | Reason |
|---|---|
| `*/compose.prod.yml` | Production infrastructure — manual change only |
| `*/.env` | Contains secrets — never read, never write, never log |
| `SPEC.md` | Source of truth — read-only for the agent |
| `REQUIREMENTS.md` | Source of truth — read-only for the agent |
| `TASKS.md` | Task tracker — read-only for the agent |
| `.github/copilot-instructions.md` | This file — read-only for the agent |

If a task requires changing production compose behaviour, stop and ask the user.

---

## 2. Module System

- **ES Modules only.** Every `.js` file must use `import`/`export`.
- `"type": "module"` must be present in every `package.json`.
- **Never use `require()`, `module.exports`, or `exports.`** anywhere.
- Import file extensions must be explicit: `import foo from './foo.js'` not `'./foo'`.

---

## 3. Async Style

- **`async`/`await` only.** Never use raw `.then()` / `.catch()` chains or callback-style APIs in application code.
- Every async route handler **must** be wrapped with `asyncHandler` from `utils/asyncHandler.js`.
- `Promise.all` is acceptable for concurrent independent async operations.
- Never use `new Promise()` wrappers around already-promise-based APIs.

---

## 4. File & Directory Naming

| Thing | Convention | Example |
|---|---|---|
| Source files | `camelCase` | `asyncHandler.js` |
| Module files | `<resource>.<layer>.js` | `notebooks.service.js` |
| Test files | `<resource>.test.js` | `notebooks.test.js` |
| Config files (root) | `kebab-case` | `compose.yaml`, `.env.example` |
| Directories | `kebab-case` | `notebooks-service/`, `conf.d/` |
| Mongoose models | Singular PascalCase in `mongoose.model()` call | `mongoose.model('Notebook', ...)` |
| Collections | Mongoose derives plural lowercase automatically — do not override |  |

---

## 5. Project Structure Rules

- **Never create files outside the layout defined in SPEC.md §3.** If a new file is genuinely needed, note it in a comment and ask before creating.
- Every new domain module must live in `src/modules/<resource>/` with exactly five files: `.model.js`, `.routes.js`, `.controller.js`, `.service.js`, `.schema.js`.
- Every new module router **must** be registered in `src/routes/index.js`.
- Shared utilities belong in `src/utils/`. Never duplicate utility code across modules.

---

## 6. Environment Variables

- **Never hardcode** any value that could vary by environment: ports, URLs, secrets, timeouts, limits.
- All variables are declared in `.env.example` and validated at startup in `src/config/env.js` using **Zod**.
- Always reference values through the validated export from `src/config/env.js`, never via `process.env` directly inside application code.
- If a new variable is needed: add it to `.env.example` with a comment, add Zod validation in `env.js`, then use it.
- `JWT_SECRET` must be validated as a string with minimum length 32. Fail at startup if shorter.

---

## 7. Layered Architecture — Strict Separation

```
Route → Controller → Service → Model
```

| Layer | What belongs here | What never belongs here |
|---|---|---|
| **Route** | HTTP method + path, middleware wiring, calling controller | Business logic, DB calls |
| **Controller** | Extract from `req`, call service, send `res` | Business logic, DB calls, `req`/`res` in service |
| **Service** | All business logic, all Mongoose calls | `req`, `res`, `next` references |
| **Model** | Mongoose schema + `mongoose.model()` export | Helper functions, business logic, service calls |
| **Schema** | Zod schemas for validation | Any runtime logic |

Violations of this separation are a blocking issue — fix before marking a task complete.

---

## 8. Error Handling

- **All intentional errors** thrown in services and controllers must use `ApiError` from `utils/ApiError.js`.
- **Never** `throw new Error(...)` directly in application code — always `throw new ApiError(statusCode, message)`.
- **Never** swallow errors silently. Either rethrow, log at `warn`/`error`, or handle explicitly.
- The global `errorHandler` middleware is the only place that sends error responses. Controllers must not send their own error responses — use `next(err)` or `asyncHandler`.
- All error responses must match this exact shape (SPEC.md §12):

```json
{
  "success": false,
  "error": {
    "message": "Human-readable message",
    "details": null
  }
}
```

- Validation errors (`422`) must populate `details` with the Zod error array.
- Stack traces must **never** appear in responses when `NODE_ENV=production`.

---

## 9. Validation

- **Never access `req.body`, `req.params`, or `req.query` in a route handler** without first applying the `validate` middleware with a Zod schema.
- Validation middleware is `middleware/validate.js` — use the factory function, do not inline Zod parsing in controllers.
- Zod schemas live exclusively in `<resource>.schema.js`. No schema definitions in controllers, services, or routes.
- Invalid ObjectId params (`/:id`) must return `422` before hitting the controller — validate in the schema.

---

## 10. Testing — Mandatory Rules

- **Every new route must have a corresponding test** in `tests/<resource>/<resource>.test.js` before the task is considered complete.
- Each endpoint must be tested for: happy path, validation failure, unauthenticated request (`401`), and not-found (`404`).
- Tests use **Jest + Supertest** against the Express app directly — no live HTTP port required.
- Use a dedicated test database (`NODE_ENV=test`). Never run tests against the development or production database.
- The database must be cleared between test suites in `tests/setup.js`.
- **`npm test` must pass before declaring any task complete.** A failing test suite is a blocking issue.
- Never use `console.log` in tests — use Jest's built-in matchers.
- Mock external HTTP calls (e.g., `notebooksClient`) in unit tests — do not make real cross-service calls in the test environment.

---

## 11. Logging

- **`console.log` is banned.** Use the Winston logger from `utils/logger.js` everywhere.
- Use the correct level: `error` for unexpected failures, `warn` for recoverable issues / degradation, `info` for lifecycle events, `debug` for development detail.
- **Never log:** passwords, JWT tokens or secrets, full request bodies containing sensitive fields, MongoDB connection strings with credentials.
- Always include structured context as the second argument: `logger.error('message', { error: err.message, userId })`.
- HTTP request logging is handled by Morgan — do not duplicate it with manual logger calls per request.

---

## 12. Security

These controls are non-negotiable. All must be present before any task that involves `app.js` is marked complete:

- `helmet()` applied globally
- `express-rate-limit` applied globally, configured from env vars
- `cors` configured from `CORS_ORIGIN` env var — never use `*` in production
- `express.json({ limit: '10kb' })` — never raise this limit without explicit instruction
- `app.set('trust proxy', 1)` set in `app.js`
- No raw `req.body` passed to Mongoose queries — always validate with Zod first
- bcrypt salt rounds minimum **12** — never lower
- JWT secret minimum **32 characters** — enforced at startup

---

## 13. Database

- Mongoose connects **once** at startup in `server.js` before `app.listen()`.
- Always set `strictQuery: true` globally before `mongoose.connect()`.
- Required connection options: `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`, `maxPoolSize: 10`.
- Every schema must have `timestamps: true`.
- Every schema must apply the standard `toJSON` transform: expose `id` (string), delete `_id` and `__v`.
- Never create a redundant `id` field — use the virtual from the transform.
- Never expose `_id` or `__v` in any API response.
- `password` fields must have `select: false` on the schema.
- Never pass `req.body` directly to `Model.create()` or `Model.findByIdAndUpdate()` — destructure only the validated, expected fields.

---

## 14. Docker & Compose Rules

- Each service (`notebooks-service`, `notes-service`) manages its own MongoDB. **No shared database.**
- `notebooks-mongodb` and `notes-mongodb` must **never** be added to `app-network`.
- Service API containers must **not** expose port 3000 to the host in any compose file other than an explicitly named dev override.
- Always use `condition: service_healthy` in `depends_on` — never bare service name.
- Health checks must be defined for every service that other services depend on.
- The `include:` directive in the root `compose.yaml` is the integration mechanism — do not manually copy service definitions between files.

---

## 15. Cross-Service Communication

- `notebooks-service` must **never** call `notes-service`. The dependency is one-directional: notes → notebooks only.
- All cross-service calls go through `utils/notebooksClient.js` — never inline `fetch`/`axios` in service files.
- Every cross-service call must have a **hard timeout of 3 000 ms**.
- When the remote service is unreachable, degrade gracefully: save the data, emit a `warn` log, return success to the caller. Never return a `5xx` for a recoverable dependency failure.
- The base URL for cross-service calls comes from `NOTEBOOKS_SERVICE_URL` env var — never hardcoded.

---

## 16. Code Style

- **Prettier** is the formatter — do not manually format. Let Prettier handle it.
- **ESLint** enforces rules — resolve all lint errors before marking a task complete.
- No unused variables or imports — ESLint will catch these; fix rather than disable.
- Arrow functions for callbacks and short utilities; named `function` declarations for exported handlers and service functions.
- Destructure `req` params at the top of each controller handler:
  ```js
  const { id } = req.params;
  const { page, limit } = req.query;
  ```
- No magic numbers or magic strings — define as named constants or pull from `env.js`.

---

## 17. What to Do When Uncertain

- **Stop and ask** rather than making assumptions about business logic, data relationships, or security decisions.
- If a task description in `TASKS.md` is ambiguous, state the ambiguity and your intended interpretation before writing code.
- If implementing a feature requires changing the directory structure defined in SPEC.md §3, stop and ask before creating new files or directories.
- If a test is failing and the fix is not obvious within two attempts, report the failure with full output rather than suppressing it.
- Do not mark a task complete until every item in its verification checklist is ticked.
