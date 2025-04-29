const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const dir = '/opt/jarvis-surv/build/';

// Убедимся, что общая директория существует
if (!fs.existsSync(dir)) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error("Не удалось создать общую директорию:", err);
  }
}

const updateEventsOnlyHandler = async (req, res) => {
  try {
    // Ожидаем, что данные приходят в формате JSON с ключами: companyId, events
    const { companyId, events } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'ID компании не передан' });
    }
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ success: false, message: 'Неверный формат ивентов' });
    }

    // Загружаем список компаний. Предполагаем, что companies.json лежит в корне проекта
    const companiesPath = path.join(__dirname, '..', '..', 'companies.json');
    if (!fs.existsSync(companiesPath)) {
      return res.status(500).json({ success: false, message: 'Файл companies.json не найден' });
    }
    let companies;
    try {
      companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Ошибка чтения companies.json', error: err.message });
    }
    const company = companies.find(c => String(c.id) === String(companyId));
    if (!company) {
      return res.status(400).json({ success: false, message: 'Компания с данным ID не найдена' });
    }

    // Определяем директорию для компании внутри /var/www/jarvis-surv
    const companyDir = path.join(dir, company.name);
    if (!fs.existsSync(companyDir)) {
      try {
        fs.mkdirSync(companyDir, { recursive: true });
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Не удалось создать директорию компании', error: err.message });
      }
    }

    // Формируем путь для файла: имя файла будет {company.name}.xlsx
    const eventsFilePath = path.join(companyDir, `${company.name}.xlsx`);

    // Создаем рабочую книгу и лист с ивентами
    const workbookEvents = XLSX.utils.book_new();
    const eventsSheet = XLSX.utils.json_to_sheet(events);
    XLSX.utils.book_append_sheet(workbookEvents, eventsSheet, 'Events');

    // Сохраняем Excel-файл
    XLSX.writeFile(workbookEvents, eventsFilePath);

    res.status(200).json({ success: true, message: 'Excel файл с ивентами успешно создан/обновлен' });
  } catch (error) {
    console.error('Ошибка обновления Excel:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления Excel', error: error.message });
  }
};

module.exports = { updateEventsOnlyHandler };
