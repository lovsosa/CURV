// src/controllers/hikvisionEventListener.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramApi = require("node-telegram-bot-api")

// Импорт JSON-сервисов вместо Excel-методов
const { jsonWorkday, closeWorkdaysInJson } = require('../services/workdayJson');
const { startB24Workday, endB24Workday, getB24WorkdayStatus } = require('../services/workday');

// Читаем список компаний
const companies = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '..', '..', 'companies.json'),
        'utf8'
    )
);

const hikVisionEventsHandler = async (req, res) => {
    const eventData = req.body;

    try {
        if (eventData && eventData.event_log) {
            const event = JSON.parse(eventData.event_log);
            const subEventType = parseInt(event.AccessControllerEvent.subEventType, 10);
            const employeeId = event.AccessControllerEvent.employeeNoString;
            const employeeName = event.AccessControllerEvent.name;
            const ipAddress = event.ipAddress;
            const eventDateTime = event.dateTime;

            const company = companies.find(c => c.ipAddress === ipAddress);
            if (!company) {
                console.log(`No company found for IP address: ${ipAddress}`);
                return res.status(200).send('Company not found');
            }
            const hrbot = new TelegramApi(company.telegramBotToken, { polling: true })
            // Обрабатываем только события открытия/закрытия рабочего дня
            if (subEventType === parseInt(company.authViaFaceEventCode, 10)) {
                console.log(
                    new Date(),
                    `Event from IP: ${ipAddress}, Company: ${company.name}, Employee: ${employeeName} (${employeeId}), DateTime: ${eventDateTime}`
                );

                const userStatus = await getB24WorkdayStatus(company.b24WebhookUrl, employeeId);
                if (userStatus.success) {
                    switch (userStatus.status) {
                        case 'PAUSED':
                        case 'CLOSED':
                            if (company.userWithBitrix) {
                                console.log(`Starting/resuming workday for: ${employeeName}`);
                                await startB24Workday(company.b24WebhookUrl, employeeId, eventDateTime, company, hrbot);
                            }
                            // await jsonWorkday(employeeId, employeeName, eventDateTime, company);
                            break;

                        case 'OPENED':
                            if (company.userWithBitrix) {
                                console.log(`Ending workday for: ${employeeName}`);
                                await endB24Workday(company.b24WebhookUrl, employeeId, eventDateTime, company, hrbot);
                            }
                            // await jsonWorkday(employeeId, employeeName, eventDateTime, company);
                            // Автозакрытие незакрытых дней по расписанию
                            // await closeWorkdaysInJson(company);
                            break;

                        default:
                            console.log(
                                `Unknown status ${userStatus.status} for ${employeeName}`
                            );
                    }
                } else {
                    console.error(
                        new Date(),
                        `Failed to fetch workday status: ${userStatus.error}`
                    );
                }
            }
        } else {
            return res.status(200).send('Skip the event');
        }

        return res.status(200).send('Event processed');
    } catch (error) {
        console.error('Error parsing event log:', error);
        return res.status(200).send('Failed to process event data');
    }
};

module.exports = { hikVisionEventsHandler };
