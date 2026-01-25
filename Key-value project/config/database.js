const { MongoClient } = require('mongodb');

let db = null;
let client = null;

async function connectToDatabase() {
  try {
    const user = process.env.MONGODB_USER;
    const password = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_HOST || 'localhost';
    const port = process.env.MONGODB_PORT || '27017';
    const dbName = process.env.DB_NAME || 'keyValueStore';

    let uri;
    if (user && password) {
      // Connection with authentication
      uri = `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=${dbName}`;
      console.log(`Connecting to MongoDB with authentication at ${host}:${port}...`);
    } else {
      // Connection without authentication (for local development)
      uri = `mongodb://${host}:${port}`;
      console.log(`Connecting to MongoDB without authentication at ${host}:${port}...`);
    }

    client = new MongoClient(uri);
    await client.connect();
    
    console.log('Connected successfully to MongoDB');
    db = client.db(dbName);
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
}

async function closeDatabase() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectToDatabase,
  getDatabase,
  closeDatabase
};
