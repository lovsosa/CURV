// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./src/middleware/auth');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');

// Routers
const hikVisionEventRouter = require('./src/routes/hikvisionEventListener');
const apiRouter = require('./src/routes/api');

// Services
const { closeWorkdaysBySchedule } = require('./src/services/workday');
const { closeWorkdaysInJson } = require('./src/services/workdayJson');

// Load companies config
const companies = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8')
);

const { APP_PORT, JWT_SECRET } = process.env;
if (!JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Protected API routes will require this.');
}

const app = express();
const port = APP_PORT || 3000;

// Middleware
app.use(express.json());
app.use(
    cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: true,
    })
);
app.use('/data', auth, express.static(path.join(__dirname, 'data')));
// Routes
app.use('/', hikVisionEventRouter);
app.use('/api', auth, apiRouter);

// Scheduled auto-close jobs for each company
companies.forEach((company) => {
    if (company.autoWorkdayClosing) {
        const job = schedule.scheduleJob(
            company.closingScheduleTime,
            async () => {
                console.log(`Проверка автозакрытия для компании ${company.name}`);
                try {
                    if (company.userWithBitrix) {
                        await closeWorkdaysBySchedule(company);
                    } else {
                        await closeWorkdaysInJson(company);
                    }
                } catch (error) {
                    console.error(
                        `Ошибка автозакрытия для ${company.name}:`,
                        error.message
                    );
                }
            }
        );

        job.on('run', () =>
            console.log(`Job for ${company.name} started at ${new Date().toISOString()}`)
        );
        job.on('error', (err) =>
            console.error(`Job error for ${company.name}:`, err)
        );
    }
});

// Start server
app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
// после всех роутов и before app.listen()
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
