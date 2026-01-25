source .env.db

# Connectivity
LOCALHOST_PORT=3000
CONTAINER_PORT=3000
source .env.network

BACKEND_IMAGE_NAME="key-value-backend"
BACKEND_CONTAINER_NAME="backend"

MONGODB_HOST="keyvalue-mongodb"

if [ "$(docker ps -aq -f name=$BACKEND_CONTAINER_NAME)" ]; then
    echo "Container $BACKEND_CONTAINER_NAME is already running."
    exit 1
fi

docker build -t $BACKEND_IMAGE_NAME \
    -f ./backend/Dockerfile.dev \
    ./backend

docker run --rm -d --name $BACKEND_CONTAINER_NAME \
  -e KEY_VALUE_STORE_DB=$KEY_VALUE_STORE_DB \
  -e KEY_VALUE_STORE_USER=$KEY_VALUE_STORE_USER \
  -e KEY_VALUE_STORE_PASSWORD=$KEY_VALUE_STORE_PASSWORD \
  -e MONGODB_HOST=$MONGODB_HOST \
  -e PORT=$CONTAINER_PORT \
  -p $LOCALHOST_PORT:$CONTAINER_PORT \
  -v ./backend/src:/app/src \
  --network $NETWORK_NAME \
  $BACKEND_IMAGE_NAME