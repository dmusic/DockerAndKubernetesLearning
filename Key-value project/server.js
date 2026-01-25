require('dotenv').config();
const express = require('express');
const { connectToDatabase, closeDatabase } = require('./config/database');
const {
  createKeyValue,
  getValueByKey,
  updateValueByKey,
  deleteKeyValue
} = require('./models/keyValue');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// POST /store - Create a new key-value pair
app.post('/store', async (req, res) => {
  try {
    const { key, value } = req.body;
    
    // Validate request body
    if (!key || value === undefined) {
      return res.status(400).json({ 
        error: 'Both "key" and "value" are required in the request body' 
      });
    }
    
    const result = await createKeyValue(key, value);
    
    if (result.exists) {
      return res.status(400).json({ 
        error: 'Key already exists' 
      });
    }
    
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error creating key-value pair:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /store/:key - Retrieve a value by key
app.get('/store/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await getValueByKey(key);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Key not found' 
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error retrieving key-value pair:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /store/:key - Update a value by key
app.put('/store/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // Validate request body
    if (value === undefined) {
      return res.status(400).json({ 
        error: '"value" is required in the request body' 
      });
    }
    
    const result = await updateValueByKey(key, value);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Key not found' 
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating key-value pair:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /store/:key - Delete a key-value pair
app.delete('/store/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const deleted = await deleteKeyValue(key);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'Key not found' 
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting key-value pair:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /health - Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('up');
});

// Start server
async function startServer() {
  try {
    await connectToDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

startServer();
