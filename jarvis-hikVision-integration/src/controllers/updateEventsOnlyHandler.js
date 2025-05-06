const path = require('path');
const fs = require('fs');
const dir = path.join(__dirname, '..', '..', 'data', 'build');

if (!fs.existsSync(dir)) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error('Не удалось создать общую директорию:', err);
  }
}

const updateEventsOnlyHandler = async (req, res) => {
  try {
    const { companyId, events } = req.body;
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

    const eventsData = Array.isArray(events) ? events : [];

    const eventsFilePath = path.join(companyDir, `${company.name}.json`);
    fs.writeFileSync(eventsFilePath, JSON.stringify(eventsData, null, 2), 'utf-8');

    res.status(200).json({ success: true, message: 'JSON файл с ивентами успешно создан/обновлен' });
  } catch (error) {
    console.error('Ошибка обновления JSON:', error);
    res.status(500).json({ success: false, message: 'Ошибка обновления JSON', error: error.message });
  }
};

module.exports = { updateEventsOnlyHandler };