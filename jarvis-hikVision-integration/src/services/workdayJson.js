// src/services/workdayJson.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Базовая директория для хранения JSON
const baseDir = path.join(__dirname, '..', '..', 'data', 'build');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
  console.log(`📁 Создана базовая директория хранения JSON: ${baseDir}`);
}

/**
 * Фиксирует событие начала/окончания рабочего дня сотрудника в формате JSON
 */
const jsonWorkday = async (employeeId, employeeName, eventDateTime, company) => {
  if (!employeeId || !employeeName) return false;

  // Директория компании
  const companyDir = path.join(baseDir, company.name);
  if (!fs.existsSync(companyDir)) {
    fs.mkdirSync(companyDir, { recursive: true });
    console.log(`📁 Создана директория компании: ${companyDir}`);
  }

  const eventsFile = path.join(companyDir, 'events.json');
  const usersFile = path.join(companyDir, 'users.json');
  const formattedDate = moment(eventDateTime).tz('Asia/Bishkek').format('DD.MM.YYYY');

  // Загрузка существующих событий
  let events = [];
  if (fs.existsSync(eventsFile)) {
    events = JSON.parse(fs.readFileSync(eventsFile, 'utf-8')) || [];
  }

  // Поиск записи по сотруднику и дате
  let record = events.find(e => e.id === employeeId && e.eventDate === formattedDate);
  if (record) {
    // Если уже закрыт — рассчитываем паузу и открываем
    if (record.endWorkTime && record.endWorkTime.trim() !== '') {
      const lastEnd = moment(record.endWorkTime, 'DD.MM.YYYY HH:mm:ss');
      if (lastEnd.isValid()) {
        const now = moment(eventDateTime).tz('Asia/Bishkek');
        record.pause = (now.diff(lastEnd, 'minutes') || 0) + (record.pause || 0);
      }
      record.endWorkTime = '';
      record.status = 'Открыто';
    } else {
      // Закрываем день
      record.endWorkTime = moment().tz('Asia/Bishkek').format('DD.MM.YYYY HH:mm:ss');
      record.status = 'Завершено';
      const start = moment(record.startWorkTime, 'DD.MM.YYYY HH:mm:ss');
      const end = moment(record.endWorkTime, 'DD.MM.YYYY HH:mm:ss');
      record.duration = `${Math.floor(end.diff(start, 'minutes') / 60)}ч ${end.diff(start, 'minutes') % 60}м`;
    }
  } else {
    // Новая запись
    record = {
      id: employeeId,
      userName: employeeName,
      eventDate: formattedDate,
      startWorkTime: moment().tz('Asia/Bishkek').format('DD.MM.YYYY HH:mm:ss'),
      endWorkTime: '',
      status: 'Открыто',
      pause: 0,
      duration: ''
    };
    events.push(record);
  }

  // Сохранение событий
  fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2), 'utf-8');

  // Загрузка и обновление списка пользователей
  let users = [];
  if (fs.existsSync(usersFile)) {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf-8')) || [];
  }
  if (!users.find(u => u.id === employeeId)) {
    users.push({ id: employeeId, name: employeeName });
    console.log(`🆕 Добавлен новый сотрудник: ${employeeName} (${employeeId})`);
  }
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');

  return true;
};

/**
 * Автоматическое закрытие незавершённых рабочих дней по расписанию
 */
const closeWorkdaysInJson = async (company) => {
  console.log("Автоматическое закрытие рабочего дня в JSON");
  const eventsFile = path.join(baseDir, company.name, 'events.json');
  if (!fs.existsSync(eventsFile)) {
    console.log(`JSON файл не найден: ${eventsFile}`);
    return;
  }

  let events = JSON.parse(fs.readFileSync(eventsFile, 'utf-8')) || [];
  const now = moment().tz('Asia/Bishkek');
  const today = now.format('DD.MM.YYYY');
  const closeTime = (company.setClosingTime || '18:00').substring(0, 5);
  let changed = false;

  events = events.map(rec => {
    if (!rec.endWorkTime || rec.endWorkTime.trim() === '') {
      const recDate = moment(rec.eventDate, 'DD.MM.YYYY');
      const closeDT = moment(`${rec.eventDate} ${closeTime}`, 'DD.MM.YYYY HH:mm');
      if (recDate.isBefore(now, 'day') || (rec.eventDate === today && now.isAfter(closeDT))) {
        rec.endWorkTime = closeDT.format('DD.MM.YYYY HH:mm:ss');
        rec.status = 'Завершено';
        const start = moment(rec.startWorkTime, 'DD.MM.YYYY HH:mm:ss');
        if (start.isValid()) {
          const end = moment(rec.endWorkTime, 'DD.MM.YYYY HH:mm:ss');
          rec.duration = `${Math.floor(end.diff(start, 'minutes') / 60)}ч ${end.diff(start, 'minutes') % 60}м`;
        }
        changed = true;
      }
    }
    return rec;
  });

  if (changed) {
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2), 'utf-8');
  }
};

module.exports = { jsonWorkday, closeWorkdaysInJson };
