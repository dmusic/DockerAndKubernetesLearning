
source .env.db
source .env.network
source .env.volume

if [ "$(docker ps -aq -f name=$DB_CONTAINER_NAME)" ]; then
    docker stop $DB_CONTAINER_NAME
    echo "Stopped container: $DB_CONTAINER_NAME"
    docker rm $DB_CONTAINER_NAME
    echo "Removed container: $DB_CONTAINER_NAME"
else
    echo "Container $DB_CONTAINER_NAME does not exist."
fi


if [ "$(docker volume ls -q -f name=$VOLUME_NAME)" ]; then
    docker volume rm $VOLUME_NAME
    echo "Removed Docker volume: $VOLUME_NAME"
else
    echo "Volume $VOLUME_NAME does not exist."
fi

if [ "$(docker network ls -q -f name=$NETWORK_NAME)" ]; then
    docker network rm $NETWORK_NAME
    echo "Removed Docker network: $NETWORK_NAME"
else
    echo "Network $NETWORK_NAME does not exist."
fi
