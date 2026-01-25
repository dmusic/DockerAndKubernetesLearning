const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const storeRouter = require('./routes/store');
const healthRouter = require('./routes/health');

const app = express();
app.use(bodyParser.json());

app.use('/health', healthRouter);
app.use('/store', storeRouter);

const PORT = process.env.PORT;
console.log('Attempting to connect to MongoDB...');

const mongoUri = `mongodb://${process.env.KEY_VALUE_STORE_USER}:${process.env.KEY_VALUE_STORE_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.KEY_VALUE_STORE_DB}?authSource=${process.env.KEY_VALUE_STORE_DB}`;

mongoose.connect(mongoUri, {
    connectTimeoutMS: 5000
}).then(() => {
    // Start the server only after successful DB connection
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

