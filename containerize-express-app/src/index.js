const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const users = [];

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Register a new user
app.post('/register', (req, res) => {
  const newUserId = req.body.userId;
  if (!newUserId) {
    return res.status(400).send('User ID is required');
  }
  if (users.includes(newUserId)) {
    return res.status(400).send('User already exists');
  }
  users.push(newUserId);
  return res.status(201).send('User registered successfully');
});


// Get registered users
app.get('/users', (req, res) => {
  return res.json({ users });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});