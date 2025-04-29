const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const dir = '/opt/jarvis-surv/build/';

// Убедимся, что общая директория существует
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const updateEventsHandler = async (req, res) => {
  try {
    // Ожидается, что данные приходят в формате JSON с ключами: companyId, schedules, shifts
    const { companyId, schedules, shifts } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'ID компании не передан' });
    }
    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ success: false, message: 'Неверный формат расписаний' });
    }
    // shifts может быть undefined, поэтому задаем пустой массив, если не переданы
    const shiftsData = Array.isArray(shifts) ? shifts : [];

    // Загружаем список компаний. Предполагаем, что companies.json лежит в корне проекта
    const companiesPath = path.join(__dirname, '..', '..', 'companies.json');
    const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
    const company = companies.find(c => String(c.id) === String(companyId));
    if (!company) {
      return res.status(400).json({ success: false, message: 'Компания с данным ID не найдена' });
    }

    // Определяем директорию для компании внутри /var/www/jarvis-surv
    const companyDir = path.join(dir, company.name);
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }

    // Формируем пути для файлов
    const scheduleFilePath = path.join(companyDir, `${company.name}Schedule.xlsx`);
    const shiftFilePath = path.join(companyDir, `${company.name}Shift.xlsx`);

    // Создаем и сохраняем файл расписаний
    const workbookSchedule = XLSX.utils.book_new();
    const schedulesSheet = XLSX.utils.json_to_sheet(schedules);
    XLSX.utils.book_append_sheet(workbookSchedule, schedulesSheet, 'Schedules');
    XLSX.writeFile(workbookSchedule, scheduleFilePath);

    // Создаем и сохраняем файл смен
    const workbookShift = XLSX.utils.book_new();
    const shiftsSheet = XLSX.utils.json_to_sheet(shiftsData);
    XLSX.utils.book_append_sheet(workbookShift, shiftsSheet, 'Shifts');
    XLSX.writeFile(workbookShift, shiftFilePath);

    res.status(200).json({ success: true, message: 'Excel файлы успешно созданы/обновлены' });
  } catch (error) {
    console.error('Ошибка обновления Excel:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления Excel', error: error.message });
  }
};

module.exports = { updateEventsHandler };
