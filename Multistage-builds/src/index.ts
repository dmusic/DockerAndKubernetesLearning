import express from 'express';
// const express = require('express'); // CommonJS syntax
const app = express();
const port = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Hello World from Docker!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});