
source .env.network
source .env.volume

if [ "$(docker volume ls -q -f name=$VOLUME_NAME)" ]; then
    echo "Volume $VOLUME_NAME already exists."
else
    echo "Creating Docker volume: $VOLUME_NAME"
    docker volume create $VOLUME_NAME
fi

if [ "$(docker network ls -q -f name=$NETWORK_NAME)" ]; then
    echo "Network $NETWORK_NAME already exists."
else
    echo "Creating Docker network: $NETWORK_NAME"
    docker network create $NETWORK_NAME
fi
