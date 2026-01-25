const { getDatabase } = require('../config/database');

const COLLECTION_NAME = 'keyValuePairs';

async function getCollection() {
  const db = getDatabase();
  return db.collection(COLLECTION_NAME);
}

async function createKeyValue(key, value) {
  const collection = await getCollection();
  
  // Check if key already exists
  const existing = await collection.findOne({ _id: key });
  if (existing) {
    return { exists: true };
  }
  
  // Insert new key-value pair
  await collection.insertOne({ _id: key, value });
  return { exists: false, data: { key, value } };
}

async function getValueByKey(key) {
  const collection = await getCollection();
  const result = await collection.findOne({ _id: key });
  
  if (!result) {
    return null;
  }
  
  return { key: result._id, value: result.value };
}

async function updateValueByKey(key, value) {
  const collection = await getCollection();
  
  const result = await collection.updateOne(
    { _id: key },
    { $set: { value } }
  );
  
  if (result.matchedCount === 0) {
    return null;
  }
  
  return { key, value };
}

async function deleteKeyValue(key) {
  const collection = await getCollection();
  
  const result = await collection.deleteOne({ _id: key });
  
  return result.deletedCount > 0;
}

module.exports = {
  createKeyValue,
  getValueByKey,
  updateValueByKey,
  deleteKeyValue
};
