// src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set');
}

const usersPath = path.join(__dirname, '..', '..', 'data', 'build', 'Jarvis', 'users.json');

router.post('/login', express.json(), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const raw = await fs.readFile(usersPath, 'utf8');
    const users = JSON.parse(raw);

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Собираем payload — сюда можно добавить любые данные пользователя
    const payload = { username: user.username };
    // Подписываем токен (установлен expiresIn по желанию)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
