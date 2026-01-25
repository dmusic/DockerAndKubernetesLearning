MONGODB_IMAGE="mongo:7"
source .env.db

# Root credentials
ROOT_USERNAME="root"
ROOT_PASSWORD="root-password"

# Connectivity
LOCALHOST_PORT=27017
CONTAINER_PORT=27017
source .env.network

# Storage
VOLUME_CONTAINER_PATH="/data/db"
source .env.volume

source setup.sh

if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
    echo "Container $DB_CONTAINER_NAME is already running."
    exit 0
fi

docker run --rm -d --name $DB_CONTAINER_NAME \
  -e MONGODB_INITDB_ROOT_USERNAME=$ROOT_USERNAME \
  -e MONGODB_INITDB_ROOT_PASSWORD=$ROOT_PASSWORD \
  -e KEY_VALUE_STORE_DB=$KEY_VALUE_STORE_DB \
  -e KEY_VALUE_STORE_USER=$KEY_VALUE_STORE_USER \
  -e KEY_VALUE_STORE_PASSWORD=$KEY_VALUE_STORE_PASSWORD \
  -v ./db-config/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro \
  -p $LOCALHOST_PORT:$CONTAINER_PORT \
  --network $NETWORK_NAME \
  -v $VOLUME_NAME:$VOLUME_CONTAINER_PATH \
  $MONGODB_IMAGE