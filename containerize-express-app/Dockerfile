FROM node:22

WORKDIR /app

# copy the package.json and package-lock.json
COPY package*.json .    
# Install the dependencies
RUN npm ci
# Copy the source code of our app
COPY src/index.js index.js
# Expose the port of the application
EXPOSE 3000
# Start the application
CMD ["node", "index.js"]