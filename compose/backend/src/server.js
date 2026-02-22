const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const storeRouter = require('./routes/store');
const healthRouter = require('./routes/health');

const app = express();

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

app.use(bodyParser.json({ limit: '10mb' }));

app.use('/health', healthRouter);
app.use('/store', storeRouter);
app.get('/', (req, res) => {
    return res.json({ message: 'Welcome to our Key-Value Store' });
});

// Error handler - must be AFTER routes
app.use((err, req, res, next) => {
    console.error('Error caught by error handler:', err);
    return res.status(400).json({ error: 'Bad request', details: err.message });
});

const PORT = process.env.PORT;
console.log('Attempting to connect to MongoDB...');

const mongoUri = `mongodb://${process.env.KEY_VALUE_USER}:${process.env.KEY_VALUE_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.KEY_VALUE_DB}?authSource=${process.env.KEY_VALUE_DB}`;

mongoose.connect(mongoUri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000
}).then(() => {
    // Start the server only after successful DB connection
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
    console.log('Connected to MongoDB!');
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

