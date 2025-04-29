require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const moment = require('moment-timezone');
const { log } = require('console');

const exelWorkday = async (employeeId, employeeName, eventDateTime, company) => {
  const eventsFilePath = `/opt/jarvis-surv/build/${company.name}/${company.name}.xlsx`;
  const userFilePath = `/opt/jarvis-surv/build/${company.name}/${company.name}User.xlsx`;
  const dir = path.dirname(eventsFilePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Создана директория: ${dir}`);
  }

  if (!employeeId || !employeeName) return false;

  const formattedDate = moment(eventDateTime).tz('Asia/Bishkek').format('DD.MM.YYYY');

  console.log(`📷 Событие: ${employeeName} (${employeeId}) зафиксирован в ${formattedDate}`);

  try {
    let workbook, worksheet, data = [];

    // === Открываем или создаем файл EVENTS ===
    if (fs.existsSync(eventsFilePath)) {
      workbook = XLSX.readFile(eventsFilePath);
      if (!workbook.Sheets['Events']) {
        worksheet = XLSX.utils.aoa_to_sheet([
          ['id', 'userName', 'eventDate', 'startWorkTime', 'endWorkTime', 'status', 'pause', 'duration']
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
      } else {
        worksheet = workbook.Sheets['Events'];
        data = XLSX.utils.sheet_to_json(worksheet);
      }
    } else {
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.aoa_to_sheet([
        ['id', 'userName', 'eventDate', 'startWorkTime', 'endWorkTime', 'status', 'pause', 'duration']
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
      data = [];
    }

    const index = data.findIndex(row => row['id'] === employeeId && row['eventDate'] === formattedDate);

    if (index !== -1) {
      if (data[index]['endWorkTime'] && data[index]['endWorkTime'].trim() !== '') {
        const lastEndTime = moment(data[index]['endWorkTime'], 'DD.MM.YYYY HH:mm:ss');
        if (lastEndTime.isValid()) {
          const currentTime = moment(eventDateTime).tz('Asia/Bishkek');
          const previousPause = data[index]['pause'] ? parseInt(data[index]['pause'], 10) : 0;
          data[index]['pause'] = currentTime.diff(lastEndTime, 'minutes') + previousPause;
        }
        data[index]['endWorkTime'] = '';
        data[index]['status'] = 'Открыто';
      } else {
        data[index]['endWorkTime'] = moment().tz('Asia/Bishkek').format('DD.MM.YYYY HH:mm:ss');
        data[index]['status'] = 'Завершено';

        const startTime = moment(data[index]['startWorkTime'], 'DD.MM.YYYY HH:mm:ss');
        const endTime = moment(data[index]['endWorkTime'], 'DD.MM.YYYY HH:mm:ss');
        data[index]['duration'] = `${Math.floor(endTime.diff(startTime, 'minutes') / 60)}ч ${endTime.diff(startTime, 'minutes') % 60}м`;
      }
    } else {
      data.push({
        'id': employeeId,
        'userName': employeeName,
        'eventDate': formattedDate,
        'startWorkTime': moment().tz('Asia/Bishkek').format('DD.MM.YYYY HH:mm:ss'),
        'endWorkTime': '',
        'status': 'Открыто',
        'pause': 0,
        'duration': '',
      });
    }

    XLSX.utils.sheet_add_json(worksheet, data, { skipHeader: false });
    XLSX.writeFile(workbook, eventsFilePath);

    // === Открываем или создаем файл USERS ===
    let userWorkbook, userWorksheet, userData = [];

    if (fs.existsSync(userFilePath)) {
      userWorkbook = XLSX.readFile(userFilePath);
      if (!userWorkbook.Sheets['Users']) {
        userWorksheet = XLSX.utils.aoa_to_sheet([
          ['id', 'name']
        ]);
        XLSX.utils.book_append_sheet(userWorkbook, userWorksheet, 'Users');
      } else {
        userWorksheet = userWorkbook.Sheets['Users'];
        userData = XLSX.utils.sheet_to_json(userWorksheet);
      }
    } else {
      userWorkbook = XLSX.utils.book_new();
      userWorksheet = XLSX.utils.aoa_to_sheet([
        ['id', 'name']
      ]);
      XLSX.utils.book_append_sheet(userWorkbook, userWorksheet, 'Users');
      userData = [];
    }

    const userIndex = userData.findIndex(row => row['id'] === employeeId);

    if (userIndex === -1) {
      userData.push({
        'id': employeeId,
        'name': employeeName
      });
      console.log(`🆕 Добавлен новый сотрудник: ${employeeName} (${employeeId}) в ${userFilePath}`);
    }

    XLSX.utils.sheet_add_json(userWorksheet, userData, { skipHeader: false });
    XLSX.writeFile(userWorkbook, userFilePath);

    return true;
  } catch (error) {
    console.error('❌ Ошибка обработки события:', error);
    return false;
  }
};

const closeWorkdaysInExcel = async (company) => {
  const eventsFilePath = `/var/www/jarvis-surv/${company.name}/${company.name}.xlsx`;
  console.log("Автоматическое закрытие рабочего дня в Excel");

  if (!fs.existsSync(eventsFilePath)) {
    console.log(`Excel файл ${eventsFilePath} не найден.`);
    return;
  }

  const workbook = XLSX.readFile(eventsFilePath);
  const worksheet = workbook.Sheets['Events'];
  let data = XLSX.utils.sheet_to_json(worksheet);
  const now = moment().tz('Asia/Bishkek');
  const currentDate = now.format('DD.MM.YYYY');
  const closingTimeStr = (company.setClosingTime || "18:00").substring(0, 5);
  let updated = false;

  data = data.map(row => {
    if (!row['endWorkTime'] || row['endWorkTime'].trim() === '') {
      const recordDate = moment(row['eventDate'], 'DD.MM.YYYY');
      const closingDateTime = moment(`${row['eventDate']} ${closingTimeStr}`, 'DD.MM.YYYY HH:mm');

      if (recordDate.isBefore(now, 'day') || (row['eventDate'] === currentDate && now.isAfter(closingDateTime))) {
        row['endWorkTime'] = closingDateTime.format('DD.MM.YYYY HH:mm:ss');
        row['status'] = 'Завершено';

        const startTime = moment(row['startWorkTime'], 'DD.MM.YYYY HH:mm:ss');
        if (startTime.isValid()) {
          const endTime = moment(row['endWorkTime'], 'DD.MM.YYYY HH:mm:ss');
          row['duration'] = `${Math.floor(endTime.diff(startTime, 'minutes') / 60)}ч ${endTime.diff(startTime, 'minutes') % 60}м`;
        }
        updated = true;
      }
    }
    return row;
  });

  if (updated) {
    const newWorksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, newWorksheet, 'Events', true);

    try {
      XLSX.writeFile(workbook, eventsFilePath);
    } catch (error) {
      console.error(`❌ Ошибка при записи в Excel: ${error.message}`);
    }
  }
};

module.exports = { exelWorkday, closeWorkdaysInExcel };
