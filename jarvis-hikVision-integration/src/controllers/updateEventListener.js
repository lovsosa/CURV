const path = require('path');
const fs = require('fs');
const dir = path.join(__dirname, '..', '..', 'data', 'build');

// Убедимся, что общая директория существует
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const updateEventsHandler = async (req, res) => {
  try {
    const { companyId, schedules, shifts } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'ID компании не передан' });
    }

    // Загружаем список компаний
    const companiesData = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../services/companies.json'), 'utf-8'
    ));
    const company = companiesData.find(c => c.id === companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Компания не найдена' });
    }

    const companyDir = path.join(dir, company.name);
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }

    // Формируем данные для JSON
    const schedulesData = Array.isArray(schedules) ? schedules.map(item => ({
      id: item.id,
      userId: item.userId,
      scheduleDate: item.scheduleDate,
      startTime: item.startTime,
      endTime: item.endTime,
    })) : [];

    const shiftsData = Array.isArray(shifts) ? shifts.map(item => ({
      id: item.id,
      name: item.name,
      start: item.start,
      end: item.end,
    })) : [];

    // Сохраняем JSON-файлы
    const scheduleFilePath = path.join(companyDir, `${company.name}_schedules.json`);
    fs.writeFileSync(scheduleFilePath, JSON.stringify(schedulesData, null, 2), 'utf-8');

    const shiftFilePath = path.join(companyDir, `${company.name}_shifts.json`);
    fs.writeFileSync(shiftFilePath, JSON.stringify(shiftsData, null, 2), 'utf-8');

    res.status(200).json({ success: true, message: 'JSON файлы успешно созданы/обновлены' });
  } catch (error) {
    console.error('Ошибка обновления JSON:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления JSON', error: error.message });
  }
};

module.exports = { updateEventsHandler };