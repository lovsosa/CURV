import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import styles from "./Schedule.module.sass";
import useExcelData from "../../hooks/useExcelData";
import { useTheme } from "../../hooks/useThemeContext";
import useServerData from "../../hooks/useServerData";
import cn from "classnames";

// Форматирование даты для ключа: "DD.MM.YYYY"
function formatDateForComparison(dateObj) {
  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}.${month}.${year}`;
}

// Простой парсер даты, ожидается формат "DD.MM.YYYY"
function parseEventDate(dateStr) {
  const parts = dateStr.split(".");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function generateHeaderDays(start, end) {
  const headerDays = [];
  const daysOfWeek = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const months = [
    "Янв",
    "Фев",
    "Март",
    "Апр",
    "Май",
    "Июнь",
    "Июль",
    "Авг",
    "Сен",
    "Окт",
    "Ноя",
    "Дек",
  ];
  let d = new Date(start);
  while (d < end) {
    const formatted = `${daysOfWeek[d.getDay()]} ${d.getDate()} ${
      months[d.getMonth()]
    }`;
    const key = formatDateForComparison(d);
    headerDays.push({ formatted, key });
    d.setDate(d.getDate() + 1);
  }
  return headerDays;
}

function getDateRange(filter) {
  const now = new Date();
  let start, end;
  switch (filter.period) {
    case "currentDay":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case "currentWeek": {
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - dayOfWeek + 1);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      break;
    }
    case "currentMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case "currentQuarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), quarter * 3 + 3, 1);
      break;
    }
    case "last7Days":
      end = new Date(now);
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case "last30Days":
      end = new Date(now);
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      break;
    case "last90Days":
      end = new Date(now);
      start = new Date(now);
      start.setDate(now.getDate() - 90);
      break;
    case "custom":
      // Если filter.start не указан, устанавливаем начало текущего месяца
      start = filter.start
        ? new Date(filter.start)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      end = filter.end ? new Date(filter.end) : now;
      // Включаем последний день полностью
      end.setDate(end.getDate() + 1);
      break;
    default:
      start = new Date(0);
      end = now;
  }
  return { start, end };
}

// Функция для безопасного форматирования времени в формат "HH:MM"
function safeFormatTime(timeStr) {
  if (typeof timeStr !== "string") return "00:00";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, "0");
    const minutes = match[2];
    return `${hours}:${minutes}`;
  }
  return "00:00";
}

export default function Schedule({ filter }) {
  const { theme } = useTheme();
  const companyName = localStorage.getItem("companyName");
  // Загружаем данные: пользователи, расписания, смены и исходные события
  const {
    data: users,
    loading: usersLoading,
    error: usersError,
  } = useExcelData(`/${companyName}/${companyName}User.xlsx`);
  const {
    data: allSchedules,
    loading: schedulesLoading,
    error: schedulesError,
  } = useExcelData(`/${companyName}/${companyName}Schedule.xlsx`);
  const {
    data: allShifts,
    loading: shiftsLoading,
    error: shiftsError,
  } = useExcelData(`/${companyName}/${companyName}Shift.xlsx`);
  const {
    data: allEvents,
    loading: eventsLoading,
    error: eventsError,
  } = useExcelData(`/${companyName}/${companyName}.xlsx`);

  // Хук для отправки данных
  const {
    sendData,
    loading: sending,
    error: sendError,
    responseData,
  } = useServerData("https://jarvis.ngrok.pro/events-only-update");

  // Состояния для построения таблицы
  const [rows, setRows] = useState([]);
  const [selectedShifts, setSelectedShifts] = useState({});

  const { start, end } = getDateRange(filter);
  const headerDays = useMemo(
    () => generateHeaderDays(start, end),
    [start, end]
  );

  // Формируем массив пользователей с посменным расписанием
  useEffect(() => {
    if (usersLoading || schedulesLoading || shiftsLoading || eventsLoading)
      return;
    if (usersError || schedulesError || shiftsError || eventsError) return;

    const newRows = [];
    users.forEach((user) => {
      const scheduleId = user.schedule;
      if (!scheduleId) return;
      const foundSchedule = allSchedules.find(
        (sch) => String(sch.id) === String(scheduleId)
      );
      if (!foundSchedule) return;
      // Пропускаем фиксированные расписания (тип 1)
      if (Number(foundSchedule.scheduleType) !== 2) return;

      // Получаем массив shiftIds
      const shiftIds = foundSchedule.shiftId
        ? String(foundSchedule.shiftId)
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id)
        : [];

      // Получаем объекты смен по их id
      const shiftOptions = shiftIds
        .map((id) => allShifts.find((sh) => String(sh.id) === id))
        .filter(Boolean);

      newRows.push({
        userId: user.id,
        userName: user.name,
        scheduleId: foundSchedule.id,
        scheduleName: foundSchedule.name,
        shiftOptions,
      });
    });
    setRows(newRows);
  }, [
    users,
    allSchedules,
    allShifts,
    allEvents,
    usersLoading,
    schedulesLoading,
    shiftsLoading,
    eventsLoading,
    usersError,
    schedulesError,
    shiftsError,
    eventsError,
  ]);

  // Новый useEffect для подтягивания idShift из уже сохраненных событий
  useEffect(() => {
    if (!allEvents || allEvents.length === 0) return;
    const initialSelected = {};
    allEvents.forEach((ev) => {
      if (ev.id && ev.eventDate && ev.idShift) {
        if (!initialSelected[ev.id]) {
          initialSelected[ev.id] = {};
        }
        initialSelected[ev.id][ev.eventDate] = ev.idShift;
      }
    });
    setSelectedShifts(initialSelected);
  }, [allEvents]);

  const handleSelectShift = (userId, dayKey, shiftId) => {
    setSelectedShifts((prev) => {
      const next = { ...prev };
      if (!next[userId]) next[userId] = {};
      next[userId][dayKey] = shiftId;
      return next;
    });
  };

  const handleSave = () => {
    // Создаем карту для сохранения существующих событий (чтобы не терять старые данные)
    const eventsMap = {};
    allEvents.forEach((ev) => {
      if (!ev.eventDate) return;
      const key = `${ev.id}_${ev.eventDate}`;
      eventsMap[key] = { ...ev };
    });

    // Обновляем или добавляем записи на основе выбранных смен
    rows.forEach((row) => {
      const { userId, userName, shiftOptions } = row;
      headerDays.forEach((day) => {
        const selectedShiftId = selectedShifts[userId]?.[day.key];
        if (!selectedShiftId) return; // если смена не выбрана, оставляем существующую запись

        // Находим выбранную смену
        const selectedShift = shiftOptions.find(
          (sh) => String(sh.id) === selectedShiftId
        );
        if (!selectedShift) return;

        // Форматируем время безопасно
        const startTime = safeFormatTime(selectedShift.startTime);
        const endTime = safeFormatTime(selectedShift.endTime);

        // Формируем уникальный ключ для записи (пользователь + дата)
        const key = `${userId}_${day.key}`;
        if (eventsMap[key]) {
          eventsMap[key].startSchedule = startTime;
          eventsMap[key].endSchedule = endTime;
          eventsMap[key].idShift = selectedShiftId;
        } else {
          eventsMap[key] = {
            id: userId,
            userName: userName,
            eventDate: day.key,
            startSchedule: startTime,
            endSchedule: endTime,
            idShift: selectedShiftId,
          };
        }
      });
    });

    const updatedEvents = Object.values(eventsMap);
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      console.error("ID компании не найден в localStorage");
      return;
    }
    const payload = {
      companyId,
      events: updatedEvents,
    };

    sendData(payload)
      .then(() => {
        console.log("Данные успешно отправлены на сервер");
      })
      .catch((err) => {
        console.error("Ошибка отправки данных:", err);
      });
  };

  if (usersLoading || schedulesLoading || shiftsLoading || eventsLoading) {
    return <div>Загрузка данных...</div>;
  }
  if (usersError) {
    return <div>Ошибка загрузки пользователей: {usersError.message}</div>;
  }
  if (schedulesError) {
    return <div>Ошибка загрузки расписаний: {schedulesError.message}</div>;
  }
  if (shiftsError) {
    return <div>Ошибка загрузки смен: {shiftsError.message}</div>;
  }
  if (eventsError) {
    return <div>Ошибка загрузки событий: {eventsError.message}</div>;
  }
  console.log(rows.length > 0);
  return rows.length > 0 ? (
    <>
      <div
        className={cn(styles.scheduleContainer, {
          [styles.darkMode]: theme === "dark",
        })}
      >
        <div className={styles.scheduleGrid}>
          <div className={styles.headerRow}>
            <div className={styles.headerCell}>Сотрудник</div>
            {headerDays.map((day) => (
              <div key={day.key} className={styles.headerCell}>
                {day.formatted}
              </div>
            ))}
          </div>
          {rows.map((row) => {
            const { userId, userName, shiftOptions } = row;
            return (
              <div key={userId} className={styles.employeeRow}>
                <div className={styles.employeeCell}>{userName}</div>
                {headerDays.map((day) => {
                  const selectedValue = selectedShifts[userId]?.[day.key] || "";
                  return (
                    <div key={day.key} className={styles.scheduleCell}>
                      <select
                        className={styles.header_select}
                        value={selectedValue}
                        onChange={(e) =>
                          handleSelectShift(userId, day.key, e.target.value)
                        }
                      >
                        <option value="">—</option>
                        {shiftOptions.map((shift) => (
                          <option key={shift.id} value={shift.id}>
                            {shift.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.btn__container}>
        <button className={styles.saveButton} onClick={handleSave}>
          Сохранить
        </button>
      </div>
    </>
  ) : (
    <div
      className={cn(styles.empty, { [styles.emptyDarkMode]: theme === "dark" })}
    >
      <h2 className={styles.empty__title}>Нету актуальных расписаний</h2>
    </div>
  );
}
