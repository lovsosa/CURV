// src/routes/api.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const dataDir = path.join(__dirname, '..', '..', 'data', 'build', 'Jarvis');

router.get('/events', async (req, res, next) => {
  try {
    const json = await fs.readFile(path.join(dataDir, 'events.json'), 'utf8');
    res.json(JSON.parse(json));
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const json = await fs.readFile(path.join(dataDir, 'users.json'), 'utf8');
    res.json(JSON.parse(json));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
