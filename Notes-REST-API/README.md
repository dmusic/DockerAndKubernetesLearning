# Notes REST API

A two-service REST API built with Node.js, Express, MongoDB, and nginx as a reverse proxy. All traffic enters through nginx on port 80; the individual services are never exposed directly to the host.

```
Client → nginx:80 → notebooks-api:3000
                  → notes-api:3000
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- Node.js 20.x (only needed to run tests locally)

---

## Quick Start

### 1. Copy the environment files

```bash
# From the Notes-REST-API directory
cp notebooks-service/.env.example notebooks-service/.env
cp notes-service/.env.example     notes-service/.env
```

### 2. Set JWT secrets

Open each `.env` file and replace the placeholder value for `JWT_SECRET` with a random string of **at least 32 characters**. You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set the **same key** in both files — a token issued at `/api/v1/auth/login` is verified by both services using only the signature, so the secrets must match:

```
# notebooks-service/.env
JWT_SECRET=<your-generated-secret>

# notes-service/.env
JWT_SECRET=<same-secret-as-above>
```

All other defaults work out of the box for local development.

### 3. Build and start the stack

```bash
docker compose up --build
```

The first run builds both service images and pulls MongoDB. nginx waits for both APIs to pass their health checks before accepting traffic — allow ~30 seconds.

On subsequent runs (no code changes):

```bash
docker compose up
```

---

## API Endpoints

All endpoints are available at `http://localhost`.

### Auth (both services share the same auth routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Register a new user |
| `POST` | `/api/v1/auth/login` | — | Login and receive a JWT |

### Notebooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/notebooks/health` | — | Service health check |
| `POST` | `/api/v1/notebooks` | Bearer | Create a notebook |
| `GET` | `/api/v1/notebooks` | Bearer | List notebooks (paginated) |
| `GET` | `/api/v1/notebooks/:id` | Bearer | Get a single notebook |
| `PUT` | `/api/v1/notebooks/:id` | Bearer | Update a notebook |
| `DELETE` | `/api/v1/notebooks/:id` | Bearer | Delete a notebook |

### Notes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Service health check |
| `POST` | `/api/v1/notes` | Bearer | Create a note |
| `GET` | `/api/v1/notes` | Bearer | List notes (paginated, filterable by `notebookId`) |
| `GET` | `/api/v1/notes/:id` | Bearer | Get a single note |
| `PUT` | `/api/v1/notes/:id` | Bearer | Update a note |
| `DELETE` | `/api/v1/notes/:id` | Bearer | Delete a note |

### Example requests

> All examples use PowerShell. Run them in a single terminal session — `$TOKEN`, `$NB_ID`, and `$NOTE_ID` are session-scoped variables.

#### Auth

```powershell
# Register a new user
Invoke-RestMethod -Method Post http://localhost/api/v1/auth/register `
  -ContentType "application/json" `
  -Body '{"email":"me@example.com","password":"password123"}'

# Login and save the token (required for all subsequent requests)
$TOKEN = (Invoke-RestMethod -Method Post http://localhost/api/v1/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"me@example.com","password":"password123"}').data.token
```

#### Notebooks

```powershell
# Create
Invoke-RestMethod -Method Post http://localhost/api/v1/notebooks `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -Body '{"name":"My Notebook","description":"First notebook"}' | ConvertTo-Json -Depth 5

# Save the returned ID for subsequent requests
$NB_ID = "<id from response above>"

# List (paginated)
Invoke-RestMethod "http://localhost/api/v1/notebooks?page=1&limit=5" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5

# Get one
Invoke-RestMethod http://localhost/api/v1/notebooks/$NB_ID `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5

# Update
Invoke-RestMethod -Method Put http://localhost/api/v1/notebooks/$NB_ID `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -Body '{"name":"Renamed Notebook"}' | ConvertTo-Json -Depth 5

# Delete (returns 204 — no output)
Invoke-RestMethod -Method Delete http://localhost/api/v1/notebooks/$NB_ID `
  -Headers @{ Authorization = "Bearer $TOKEN" }
```

#### Notes

```powershell
# Create
Invoke-RestMethod -Method Post http://localhost/api/v1/notes `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -Body '{"title":"Hello","content":"My first note"}' | ConvertTo-Json -Depth 5

# Save the returned ID for subsequent requests
$NOTE_ID = "<id from response above>"

# List all notes
Invoke-RestMethod http://localhost/api/v1/notes `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5

# List notes filtered by notebook
Invoke-RestMethod "http://localhost/api/v1/notes?notebookId=$NB_ID" `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5

# Get one
Invoke-RestMethod http://localhost/api/v1/notes/$NOTE_ID `
  -Headers @{ Authorization = "Bearer $TOKEN" } | ConvertTo-Json -Depth 5

# Update
Invoke-RestMethod -Method Put http://localhost/api/v1/notes/$NOTE_ID `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -Body '{"title":"Updated title","content":"Updated content"}' | ConvertTo-Json -Depth 5

# Delete (returns 204 — no output)
Invoke-RestMethod -Method Delete http://localhost/api/v1/notes/$NOTE_ID `
  -Headers @{ Authorization = "Bearer $TOKEN" }
```

#### Health checks (no auth required)

```powershell
Invoke-RestMethod http://localhost/api/v1/notebooks/health
Invoke-RestMethod http://localhost/health
```

---

## Running Tests

A local MongoDB instance is required. The quickest way:

```bash
docker run -d --name mongo-test -p 27017:27017 mongo:7 --quiet
```

Then run each service's tests from its `api/` directory:

```bash
cd notebooks-service/api && npm install && npm test
cd notes-service/api     && npm install && npm test
```

Expected output: **12 passing** (notebooks) and **16 passing** (notes).

Stop the test database when done:

```bash
docker stop mongo-test && docker rm mongo-test
```

---

## Useful Commands

```bash
# Tail logs from all services
docker compose logs -f

# Tail logs from one service
docker compose logs -f notebooks-api
docker compose logs -f notes-api

# Stop containers (data is preserved in volumes)
docker compose down

# Stop and wipe all data (volumes destroyed)
docker compose down -v

# Rebuild a single service after code changes
docker compose up --build notebooks-api
```

---

## Project Structure

```
Notes-REST-API/
├── compose.yaml                   # Root integration compose (nginx + both services)
├── nginx/                         # nginx reverse proxy config
│   ├── nginx.conf
│   └── conf.d/default.conf
├── notebooks-service/
│   ├── .env.example               # Environment variable template
│   ├── compose.yaml               # Service-level compose (api + mongodb)
│   └── api/
│       ├── Dockerfile
│       ├── package.json
│       ├── src/
│       │   ├── app.js
│       │   ├── server.js
│       │   ├── config/            # env.js (Zod), database.js (Mongoose)
│       │   ├── middleware/        # auth, validate, errorHandler, notFound
│       │   ├── modules/
│       │   │   ├── auth/          # register, login, JWT
│       │   │   └── notebooks/     # CRUD
│       │   ├── routes/
│       │   └── utils/             # ApiError, asyncHandler, logger
│       └── tests/
│           └── notebooks/
└── notes-service/
    ├── .env.example
    ├── compose.yaml
    └── api/
        ├── Dockerfile
        ├── package.json
        ├── src/
        │   ├── app.js
        │   ├── server.js
        │   ├── config/
        │   ├── middleware/
        │   ├── modules/
        │   │   ├── auth/
        │   │   └── notes/         # CRUD + cross-service notebook validation
        │   ├── routes/
        │   └── utils/             # + notebooksClient.js
        └── tests/
            └── notes/
```

---

## Architecture Notes

- **No shared database.** Each service owns its own MongoDB instance (`notebooks-mongodb`, `notes-mongodb`). They are on isolated internal networks and never reachable from the host or from nginx.
- **Cross-service calls.** When a note is created with a `notebookId`, notes-service calls notebooks-service to verify the notebook exists (3 s timeout). If notebooks-service is unreachable, the note is saved anyway — the failure is logged at `warn` level and success is returned to the caller (graceful degradation).
- **JWT auth.** Each service issues and validates its own JWTs independently. The `JWT_SECRET` values do not need to match between services.
