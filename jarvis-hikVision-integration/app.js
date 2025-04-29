require('dotenv').config();
const express = require('express');
const cors = require('cors');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');
const hikVisionEventRouter = require('./src/routes/hikvisionEventListener');
const { closeWorkdaysBySchedule } = require('./src/services/workday');
const { closeWorkdaysInExcel } = require('./src/services/workdayExcel');

const companies = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));

const { APP_PORT } = process.env;
const app = express();
const port = APP_PORT || 3000;

app.use(express.json());

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
}));


app.use('/', hikVisionEventRouter);

companies.forEach((company) => {
    if (company.autoWorkdayClosing) {
        schedule.scheduleJob(company.closingScheduleTime, async () => {
            console.log(`Проверка сотрудников с незавершенным рабочим днем компании ${company.name}...`);
            try {
                if (company.userWithBitrix) {
                    await closeWorkdaysBySchedule(company);
                } else {
                    // Для компаний без Bitrix вызываем функцию закрытия рабочего дня в Excel
                    await closeWorkdaysInExcel(company);
                }
            } catch (error) {
                console.error('Ошибка выполнения поиска для компании:', company.name, error.message);
            }
        });
    }
});

app.listen(port, async () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
