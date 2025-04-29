require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { exelWorkday } = require('../services/workdayExcel');
const { startB24Workday, endB24Workday, getB24WorkdayStatus } = require('../services/workday');

const companies = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'companies.json'), 'utf8'));

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

            const company = companies.find(company => company.ipAddress === ipAddress);

            if (!company) {
                console.log(`No company found for IP address: ${ipAddress}`);
                return res.status(200).send("Company not found");
            }
            // Проверяем, есть ли у компании Битрикс24
            if (subEventType === parseInt(company.authViaFaceEventCode, 10)) {
                console.log(new Date(), `Received event from IP: ${ipAddress}, Company: ${company.name}, Employee: ${employeeName}, EmployeeId: ${employeeId}, EventDateTime: ${event.dateTime}`);
                const userStatus = await getB24WorkdayStatus(company.b24WebhookUrl, employeeId);
                if (userStatus.success) {
                    switch (userStatus.status) {
                        case 'PAUSED':
                            if (company.userWithBitrix) {
                                console.log(`Resuming workday for: ${employeeName}`);
                                await startB24Workday(company.b24WebhookUrl, employeeId, eventDateTime);
                                await exelWorkday(employeeId, employeeName, eventDateTime, company);
                            }
                            else {
                                await exelWorkday(employeeId, employeeName, eventDateTime, company);
                            }
                            break;
                        case 'CLOSED':
                            if (company.userWithBitrix) {
                                console.log(`Starting new workday for: ${employeeName}`);
                                await startB24Workday(company.b24WebhookUrl, employeeId, eventDateTime);
                                await exelWorkday(employeeId, employeeName, eventDateTime, company);
                            }
                            else {
                                await exelWorkday(employeeId, employeeName, eventDateTime, company);
                            }
                            break;
                        case 'OPENED':
                            if (company.userWithBitrix) {
                                console.log(`Ending workday for: ${employeeName}`);
                                await endB24Workday(company.b24WebhookUrl, employeeId, eventDateTime);
                                await exelWorkday(employeeId, employeeName, eventDateTime, company);
                            }
                            else {
                                await exelWorkday(employeeId, employeeName, eventDateTime, company);
                            }
                            break;
                        default:
                            console.log(`Unknown workday status for: ${employeeName}, status: ${userStatus.status}`);
                            break;
                    }
                } else {
                    console.error(new Date(), `Failed to get user status: ${userStatus.error}`);
                }
            }
        } else {
            return res.status(200).send("Skip the event");
        }

        // console.log(new Date(), 'Ивент успешно обработан');
        return res.status(200).send("Event processed");
    } catch (error) {
        console.error('Error parsing event log:', error);
        return res.status(200).send("Failed to process event data");
    }
};

module.exports = { hikVisionEventsHandler };
