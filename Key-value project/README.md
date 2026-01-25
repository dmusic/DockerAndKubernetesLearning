# Key-Value Store API

A simple Express.js REST API for key-value storage using MongoDB.

## Features

- **POST /store** - Create a new key-value pair
- **GET /store/:key** - Retrieve a value by key
- **PUT /store/:key** - Update a value by key
- **DELETE /store/:key** - Delete a key-value pair
- **GET /health** - Health check endpoint

## Prerequisites

### Option 1: Docker (Recommended)
- Docker
- Docker Compose

### Option 2: Local Development
- Node.js (v14 or higher)
- MongoDB (running locally or remotely)

## Running with Docker

The easiest way to run the application is with Docker Compose, which sets up both the Express.js app and MongoDB database with proper networking and data persistence.

### Start the application:
```bash
docker-compose up -d
```

This command will:
- Build the Express.js application container
- Pull the MongoDB image
- Create a Docker network for communication between containers
- Create a Docker volume for MongoDB data persistence
- Start both containers

### View logs:
```bash
docker-compose logs -f
```

### Stop the application:
```bash
docker-compose down
```

### Stop and remove all data (including the volume):
```bash
docker-compose down -v
```

The server will be accessible at `http://localhost:3000`.

## Running Locally (Without Docker)

### Installation

1. Clone the repository or navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Update the `.env` file with your MongoDB connection string if needed:
```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=keyValueStore
PORT=3000
```

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on port 3000 (or the port specified in your `.env` file).

## API Endpoints

### Create Key-Value Pair
**POST** `/store`

Request body:
```json
{
  "key": "myKey",
  "value": "myValue"
}
```

Responses:
- `201 Created` - Key-value pair created successfully
- `400 Bad Request` - Missing key or value, or key already exists

---

### Get Value by Key
**GET** `/store/:key`

Responses:
- `200 OK` - Returns the key-value pair
  ```json
  {
    "key": "myKey",
    "value": "myValue"
  }
  ```
- `404 Not Found` - Key does not exist

---

### Update Value by Key
**PUT** `/store/:key`

Request body:
```json
{
  "value": "newValue"
}
```

Responses:
- `200 OK` - Value updated successfully
- `400 Bad Request` - Missing value in request body
- `404 Not Found` - Key does not exist

---

### Delete Key-Value Pair
**DELETE** `/store/:key`

Responses:
- `204 No Content` - Key-value pair deleted successfully
- `404 Not Found` - Key does not exist

---

### Health Check
**GET** `/health`

Response:
- `200 OK` - Returns "up"

## Project Structure

```
.
├── config/
│   └── database.js       # MongoDB connection configuration
├── models/
│   └── keyValue.js       # Key-value operations
├── server.js             # Main application file
├── Dockerfile            # Docker image configuration
├── docker-compose.yml    # Docker Compose orchestration
├── .dockerignore         # Docker build exclusions
├── package.json          # Project dependencies
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Docker Architecture

The application consists of two containers:

1. **app** - Express.js application
   - Built from the local Dockerfile
   - Exposed on port 3000
   - Connects to MongoDB via Docker network

2. **mongodb** - MongoDB database
   - Uses official MongoDB 7 image
   - Data persisted in `mongodb-data` volume
   - Accessible to app container via Docker network

**Network:** `keyvalue-network` (bridge driver) enables communication between containers

**Volume:** `mongodb-data` persists MongoDB data to local storage

## Testing with curl

```bash
# Create a key-value pair
curl -X POST http://localhost:3000/store \
  -H "Content-Type: application/json" \
  -d '{"key":"testKey","value":"testValue"}'

# Get a value
curl http://localhost:3000/store/testKey

# Update a value
curl -X PUT http://localhost:3000/store/testKey \
  -H "Content-Type: application/json" \
  -d '{"value":"updatedValue"}'

# Delete a key
curl -X DELETE http://localhost:3000/store/testKey

# Health check
curl http://localhost:3000/health
```

## License

ISC
