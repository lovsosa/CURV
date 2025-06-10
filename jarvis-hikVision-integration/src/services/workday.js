require('dotenv').config();
const axios = require('axios');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { log } = require('console');


const startB24Workday = async (bitrixWebhook, bitrixUserId, eventDateTime, company, hrbot) => {
    try {
        // Получаем данные о времени работы пользователя
        const workTimeData = await getUserWorkTimeData(bitrixWebhook, bitrixUserId, company.fieldTelegramID);
        const chatId = workTimeData?.telegramChatId;
        const timeStart = workTimeData?.timeStart;
        console.log("startB24Workday:", eventDateTime);
        // Формируем тело запроса в зависимости от наличия времени начала
        const payload = !timeStart
            ? {
                USER_ID: bitrixUserId,
                TIME: eventDateTime,
                REPORT: "Открыто автоматически камерой HikVision"
            }
            : { USER_ID: bitrixUserId };
        // Отправляем запрос в Bitrix24
        const response = await axios.post(`${bitrixWebhook}timeman.open`, payload);
        // Проверяем, что данные ответа присутствуют
        const resultData = response?.data?.result;
        if (!resultData) {
            console.error("Нет данных результата от timeman.open");
            return { success: false, message: "Нет данных результата" };
        }
        if (resultData.STATUS === "OPENED") {
            if (company.messageToTelegram && chatId) {
                await hrbot.sendMessage(chatId, `Доброе утро, ${workTimeData?.name}! Ваш рабочий день успешно начат. Удачной работы!`);
            }
            return {
                success: true,
                message: "Рабочий день начат успешно",
                data: resultData
            };
        } else {
            if (company.messageToTelegram && chatId) {
                await hrbot.sendMessage(chatId, `Доброе утро, ${workTimeData?.name}! Произошла ошибка, пожалуйста запустите рабочий день вручную.`);
            }
            const errorMsg = response.data.error || resultData.STATUS;
            console.error("Ошибка при начале рабочего дня:", errorMsg);
            return {
                success: false,
                message: "Ошибка при начале рабочего дня",
                error: errorMsg
            };
        }
    } catch (error) {
        if (company.messageToTelegram && chatId) {
            await hrbot.sendMessage(chatId, `Ошибка сервера при попытке начать ваш рабочий день. Пожалуйста, запустите рабочий день вручную и свяжитесь с Мелисом.`);
        }
        console.error(
            `Ошибка сервера при попытке начать рабочий день для пользователя ${bitrixUserId}:`,
            error.message
        );
        return {
            success: false,
            message: "Ошибка сервера при попытке начать рабочий день",
            error: error.message
        };
    }
};


const endB24Workday = async (bitrixWebhook, bitrixUserId, eventDateTime, company, hrbot) => {
    const workTimeData = await getUserWorkTimeData(bitrixWebhook, bitrixUserId, company.fieldTelegramID);
    const chatId = workTimeData?.telegramChatId;
    try {
        const response = await axios.post(`${bitrixWebhook}timeman.close`, {
            user_id: bitrixUserId,
            TIME: eventDateTime,
            REPORT: "Закрыто автоматически камерой HikVision"
        });
        if (response.data.result.STATUS === 'CLOSED') {
            if (company.messageToTelegram && chatId) {
                await hrbot.sendMessage(chatId, `Ваш рабочий день успешно завершен. Хорошего вечера!`);
            }
            // console.log(new Date(), 'Рабочий день завершён успешно:', response.data.result);
            return {
                success: true,
                message: 'Рабочий день завершён успешно',
                data: response.data.result
            };
        } else {
            if (company.messageToTelegram && chatId) {
                await hrbot.sendMessage(chatId, `Произошла ошибка, пожалуйста завершите рабочий день вручную.`);
            }
            // console.error('Ошибка при завершении рабочего дня:', response.data.error || response.data.result.STATUS);
            return {
                success: false,
                message: 'Ошибка при завершении рабочего дня',
                error: response.data.error || response.data.result.STATUS
            };
        }
    } catch (error) {
        if (company.messageToTelegram && chatId) {
            await hrbot.sendMessage(chatId, `Ошибка сервера при попытке завершить ваш рабочий день. Пожалуйста, завершите рабочий день вручную и свяжитесь с Мелисом.`);
        }
        console.error(new Date(), `Ошибка сервера при попытке завершить рабочий день для пользователя ${bitrixUserId} в Bitrix24:`, error.message);
        return {
            success: false,
            message: 'Ошибка сервера при попытке завершить рабочий день',
            error: error.message
        };
    }
};

const getB24WorkdayStatus = async (bitrixWebhook, bitrixUserId) => {
    try {
        const response = await axios.get(`${bitrixWebhook}timeman.status`, {
            params: {
                USER_ID: bitrixUserId
            }
        });

        if (response.data.error) {
            // console.error(new Date(), 'Ошибка при получении статуса рабочего дня:', response.data.error_description);
            return {
                success: false,
                status: null,
                error: response.data.error_description
            };
        }

        const statusInfo = response.data.result;
        if (!statusInfo) {
            // console.error('Статус рабочего дня не найден');
            return {
                success: false,
                status: null,
                error: 'Статус рабочего дня не найден'
            };
        }

        // console.log(`Статус рабочего дня для пользователя ${bitrixUserId}:`, statusInfo.STATUS);
        return {
            success: true,
            status: statusInfo.STATUS,
            error: null
        };
    } catch (error) {
        console.error(new Date(), 'Ошибка при подключении к Bitrix24 и получении статусов рабочего дня:', error.message);
        return { success: false, status: null, error: error.message };
    }
};

const getUsersFromBitrix = async (bitrixWebhook) => {
    try {
        const response = await axios.get(`${bitrixWebhook}user.get`, {
            params: {
                ACTIVE: 'Y'
            }
        });
        return response.data.result;
    } catch (error) {
        console.error(new Date(), 'Ошибка при получении пользователей из Bitrix24:', error.message);
        throw error;
    }
};

const closeWorkdaysBySchedule = async (company) => {
    const [closingHour, closingMinute] = (company.setClosingTime || '20:00').split(':').map(Number);
    const timeToClose = moment()
        .tz('Asia/Bishkek')
        .hours(closingHour)
        .minutes(closingMinute)
        .seconds(0)
        .format();
    try {
        const activeEmployees = await getUsersFromBitrix(company.b24WebhookUrl);

        const employeePromises = activeEmployees.map(async (employee) => {
            const employeeStatusResponse = await axios.get(`${company.b24WebhookUrl}timeman.status`, {
                params: { user_id: employee.ID }
            });

            if (employeeStatusResponse.data.error) {
                console.log(new Date(), `Ошибка при получении статуса рабочего дня для сотрудника ${employee.NAME}:`, employeeStatusResponse.data.error_description);
                return null;
            }

            const statusInfo = employeeStatusResponse.data.result;
            if (statusInfo.STATUS === 'OPENED') {
                try {
                    console.log(new Date(), `Closing workday for employee ${employee.NAME} at ${timeToClose}`);
                    const closeResponse = await axios.post(`${company.b24WebhookUrl}timeman.close`, {
                        user_id: employee.ID,
                        TIME: timeToClose,
                        REPORT: "Рабочий день завершен автоматически камерой HikVision"
                    });

                    if (closeResponse.data.result.STATUS === 'OPENED') {
                        console.log(`Ошибка при закрытии рабочего дня для сотрудника ${employee.NAME}:`, closeResponse.data.error || closeResponse.data.result.STATUS);
                    }
                } catch (error) {
                    console.log(new Date(), `Ошибка при подключении к Bitrix24 при закрытии рабочего дня для сотрудника ${employee.NAME}:`, error.message);
                    throw error;
                }
            }
        });

        await Promise.all(employeePromises);
    } catch (error) {
        console.error(new Date(), `Ошибка при обработке компании ${company.name}:`, error.message);
        throw error;
    }
};
// Вводим данные в список
const getUserWorkTimeData = async (bitrixWebhook, bitrixUserId, TG_FIELD_NAME) => {
    try {
        const response = await axios.get(`${bitrixWebhook}timeman.status`, {
            params: { user_id: bitrixUserId }
        });
        const getUserProfile = await axios.get(`${bitrixWebhook}user.get?ID=${bitrixUserId}`);
        return {
            name: getUserProfile.data.result[0].NAME,
            lastName: getUserProfile.data.result[0].LAST_NAME,
            photo: getUserProfile.data.result[0].PERSONAL_PHOTO,
            timeStart: response.data.result.TIME_START,
            timeFinish: response.data.result.TIME_FINISH,
            duration: response.data.result.DURATION,
            timeLeaks: response.data.result.TIME_LEAKS,
            telegramChatId: getUserProfile.data.result[0][TG_FIELD_NAME],
        }
    } catch (error) {
        console.error(`Ошибка getUserWorkTimeData`, error.message);
        return {
            success: false,
            message: 'Ошибка сервера при попытке отправить данные getUserWorkTimeData',
            error: error.message
        };
    }
}
// const getListDataAboutUser = async (bitrixWebhook, bitrixUserId, companyWorkTimeList) => {
//     const today = new Date();
//     const options = { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric' };
//     const formattedDate = new Intl.DateTimeFormat('ru-RU', options).format(today).split('.').join('.');
//     const formattedDateStart = `${formattedDate} 00:00:00`;
//     const formattedDateEnd = `${formattedDate} 23:59:59`;
//     try {
//         const WorkTimeList = await axios.get(`${bitrixWebhook}lists.element.get`, {
//             params: {
//                 IBLOCK_TYPE_ID: companyWorkTimeList.workTimeListType,
//                 IBLOCK_ID: companyWorkTimeList.workTimeListId,
//                 FILTER: {
//                     [companyWorkTimeList.fields.id]: bitrixUserId,
//                     [">=" + companyWorkTimeList.fields.month]: formattedDateStart,
//                     ["<=" + companyWorkTimeList.fields.month]: formattedDateEnd
//                 }
//             }
//         });
//         if (!WorkTimeList.data.result || WorkTimeList.data.result.length === 0) {
//             return {
//                 dataCompleted: false,
//                 success: false
//             };
//         } else {
//             return {
//                 element_ID: WorkTimeList.data.result[0].ID,
//                 elementMonth: WorkTimeList.data.result[0][companyWorkTimeList.fields.month],
//                 elementChange: WorkTimeList.data.result[0][companyWorkTimeList.fields.change],
//                 elemenStartTime: WorkTimeList.data.result[0][companyWorkTimeList.fields.startTime],
//                 elemenEndTime: WorkTimeList.data.result[0][companyWorkTimeList.fields.endTime],
//                 elemenTimeStart: WorkTimeList.data.result[0][companyWorkTimeList.fields.startWorkDay],
//                 success: true,
//                 dataCompleted: true,
//             };
//         }
//     } catch (error) {
//         console.error(`Ошибка getListDataAboutUser `, error.message);
//         return {
//             success: false,
//             message: 'Ошибка сервера при попытке отправить данные',
//             error: error.message
//         };
//     }
// }
// const startB24WorkTimeList = async (bitrixWebhook, bitrixUserId, workTimeList) => {
//     const today = new Date();
//     const offset = 6 * 60 * 60 * 1000;
//     const localTime = new Date(today.getTime() + offset);
//     const formattedDate = localTime.toISOString().split("T")[0];
//     const uniqueElementCode = `element_${Date.now()}`;
//     const dontRepeat = await getListDataAboutUser(bitrixWebhook, bitrixUserId, workTimeList);
//     const userData = await getUserWorkTimeData(bitrixWebhook, bitrixUserId);
//     if (dontRepeat.dataCompleted) {
//         console.log("Елемент уже существует: startB24WorkTimeList");
//         try {
//             // Отправляем обновленный элемент
//             const response = await axios.post(`${bitrixWebhook}lists.element.update`, {
//                 IBLOCK_TYPE_ID: workTimeList.workTimeListType,
//                 IBLOCK_ID: workTimeList.workTimeListId,
//                 ELEMENT_ID: dontRepeat.element_ID,
//                 FIELDS: {
//                     [workTimeList.fields.id]: bitrixUserId,
//                     [workTimeList.fields.name]: userData.name + " " + userData.lastName,
//                     [workTimeList.fields.month]: dontRepeat.elementMonth,
//                     [workTimeList.fields.startTime]: dontRepeat.elemenStartTime,
//                     [workTimeList.fields.endTime]: dontRepeat.elemenEndTime,
//                     [workTimeList.fields.change]: dontRepeat.elementChange,
//                     [workTimeList.fields.startWorkDay]: userData.timeStart,
//                 }
//             })
//             if (response.data.result) {
//                 return {
//                     success: true,
//                     message: 'Данные успешно обновлены',
//                     data: response.data.result
//                 };
//             } else {
//                 return {
//                     success: false,
//                     message: 'Ошибка при обновлении данных',
//                     error: response.data.error || "Неизвестная ошибка"
//                 };
//             }
//         } catch (error) {
//             console.error(`Ошибка сервера при попытке получить данные серверов Bitrix24: endB24WorkTimeList`, error.message);
//             return {
//                 success: false,
//                 message: 'Ошибка сервера при попытке отправить данные',
//                 error: error.message
//             };
//         }
//     } else {
//         console.log("Елемент не найден создаем новый елемент: startB24WorkTimeList");
//         try {
//             const response = await axios.post(`${bitrixWebhook}lists.element.add`,
//                 {
//                     IBLOCK_TYPE_ID: workTimeList.workTimeListType,
//                     IBLOCK_ID: workTimeList.workTimeListId,
//                     ELEMENT_CODE: uniqueElementCode,
//                     FIELDS: {
//                         [workTimeList.fields.id]: bitrixUserId,
//                         [workTimeList.fields.name]: userData.name + " " + userData.lastName,
//                         [workTimeList.fields.month]: formattedDate,
//                         [workTimeList.fields.startWorkDay]: userData.timeStart,
//                     }
//                 });
//             if (response.data.result) {
//                 return {
//                     success: true,
//                     message: 'Данные успешно отправлены',
//                     data: response.data.result,
//                 };
//             } else {
//                 return {
//                     success: false,
//                     message: 'Ошибка при попытке отправить данные',
//                     error: response.data.error || "Неизвестная ошибка",
//                 };
//             }
//         } catch (error) {
//             console.error(new Date(), `Ошибка сервера при попытке отправить данные в Bitrix24:`, error.message);
//             return {
//                 success: false,
//                 message: 'Ошибка сервера при попытке отправить данные',
//                 error: error.message,
//             };
//         }
//     }
// };
// const endB24WorkTimeList = async (bitrixWebhook, bitrixUserId, workTimeList) => {
//     const elementData = await getListDataAboutUser(bitrixWebhook, bitrixUserId, workTimeList)
//     const userData = await getUserWorkTimeData(bitrixWebhook, bitrixUserId);
//     if (!elementData.success) {
//         return console.log("Елемент не обновлен: endB24WorkTimeList");
//     } else {
//         try {
//             // Отправляем обновленный элемент
//             const response = await axios.post(`${bitrixWebhook}lists.element.update`, {
//                 IBLOCK_TYPE_ID: workTimeList.workTimeListType,
//                 IBLOCK_ID: workTimeList.workTimeListId,
//                 ELEMENT_ID: elementData.element_ID,
//                 FIELDS: {
//                     [workTimeList.fields.id]: bitrixUserId,
//                     [workTimeList.fields.name]: userData.name + " " + userData.lastName,
//                     [workTimeList.fields.month]: elementData.elementMonth,
//                     [workTimeList.fields.change]: elementData.elementChange,
//                     [workTimeList.fields.startTime]: elementData.elemenStartTime,
//                     [workTimeList.fields.endTime]: elementData.elemenEndTime,
//                     [workTimeList.fields.startWorkDay]: userData.timeStart,
//                     [workTimeList.fields.endWorkDay]: userData.timeFinish,
//                     [workTimeList.fields.workDayDuration]: userData.duration,
//                     [workTimeList.fields.workBreak]: userData.timeLeaks,
//                     [workTimeList.fields.elementComplete]: "Да"
//                 }
//             }, {
//                 headers: { "Content-Type": "application/json" }
//             });
//             if (response.data.result) {
//                 return {
//                     success: true,
//                     message: 'Данные успешно обновлены',
//                     data: response.data.result
//                 };
//             } else {
//                 return {
//                     success: false,
//                     message: 'Ошибка при обновлении данных',
//                     error: response.data.error || "Неизвестная ошибка"
//                 };
//             }
//         } catch (error) {
//             console.error(`Ошибка сервера при попытке получить данные серверов Bitrix24: endB24WorkTimeList`, error.message);
//             return {
//                 success: false,
//                 message: 'Ошибка сервера при попытке отправить данные',
//                 error: error.message
//             };
//         }
//     }
// };

module.exports = {
    startB24Workday,
    endB24Workday,
    getB24WorkdayStatus,
    closeWorkdaysBySchedule,
};
