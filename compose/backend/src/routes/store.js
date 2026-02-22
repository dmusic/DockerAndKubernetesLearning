const express = require('express');
const KeyValue = require('../models/keyValue');

const router = express.Router();

router.post('/', async (req, res) => {
    const { key, value } = req.body;

    if (!key || !value) {
        return res.status(400).json({ error: 'Both Key and value are required' });
    }
    try {
        const existingKey = await KeyValue.findOne({ key });
        if (existingKey) {
            return res.status(400).json({ error: 'Key already exists' });
        }

        const keyValue = new KeyValue({ key, value });
        await keyValue.save();

        res.status(201).json({ message: 'Key-value pair created successfully' });
    } catch (error) {
        console.error('Error creating key-value pair:', error);
        res.status(500).send('Internal server error');
    }
});
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        console.log('Looking for key:', key);
        const keyValue = await KeyValue.findOne({ key }).maxTimeMS(5000);

        if (!keyValue) {
            console.log('Key not found:', key);
            return res.status(404).json({ error: 'Key not found' });
        }

        console.log('Key found:', keyValue);
        res.status(200).json({ [keyValue.key]: keyValue.value });
    } catch (error) {
        console.error('Error retrieving value:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
router.put('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({ error: 'Value is required' });
        }
        const keyValue = await KeyValue.findOneAndUpdate({ key }, { value }, { new: true });

        if (!keyValue) {
            return res.status(404).json({ error: 'Key not found' });
        }
        res.status(200).json({ message: 'Key-value pair updated successfully', key: keyValue.key, value: keyValue.value });
    } catch (error) {
        console.error('Error updating value:', error);
        res.status(500).send('Internal server error');
    }
});
router.delete('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const keyValue = await KeyValue.findOneAndDelete({ key });

        if (!keyValue) {
            return res.status(404).json({ error: 'Key not found' });
        }
        res.status(204).json({ message: 'Key-value pair deleted successfully', key });
    } catch (error) {
        console.error('Error deleting key-value pair:', error);
        res.status(500).send('Internal server error');
    }
});

module.exports = router;