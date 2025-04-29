import React, { useMemo, useState } from "react";
import useExcelData from "../../hooks/useExcelData";
import { useTheme } from "../../hooks/useThemeContext";
import styles from "./Records.module.sass";

// Парсинг строки "HH:MM" в минуты
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const [hh, mm] = timeStr.split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

// Форматирование минут в строку "Xч Yм"
function formatDuration(minutes) {
  if (minutes <= 0) return "0м";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m ? `${m}м` : ""}` : `${m}м`;
}

// Извлекаем время "HH:MM" из строки "dd.mm.yyyy HH:MM:SS"
function extractTime(datetimeStr) {
  if (!datetimeStr) return "";
  const parts = datetimeStr.split(" ");
  if (parts.length < 2) return "";
  return parts[1].slice(0, 5);
}

// Парсинг даты в формате "dd.mm.yyyy"
function parseDateDMY(dateStr) {
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
}

// Получаем аббревиатуру дня недели из даты (например, "Пн")
function getDayAbbr(dateStr) {
  const date = parseDateDMY(dateStr);
  const map = {
    0: "Вс",
    1: "Пн",
    2: "Вт",
    3: "Ср",
    4: "Чт",
    5: "Пт",
    6: "Сб",
  };
  return map[date.getDay()];
}

// Парсинг строки длительности в минуты (формат "5ч 43м")
function parseDuration(durationStr) {
  const hourMatch = durationStr.match(/(\d+)\s*ч/);
  const minuteMatch = durationStr.match(/(\d+)\s*м/);
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
  return hours * 60 + minutes;
}

// Функция, возвращающая диапазон дат по выбранному периоду
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

// Компонент для отображения таблицы одного расписания с сортировкой
function ScheduleReport({ schedule }) {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const { usersStats } = schedule;

  const sortedStats = useMemo(() => {
    if (!sortConfig.key) return usersStats;
    const sorted = [...usersStats].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key])
        return sortConfig.direction === "ascending" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key])
        return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [usersStats, sortConfig]);

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className={styles.scheduleBlock}>
      <h3>{schedule.scheduleName}</h3>
      <table className={styles.reportTable}>
        <thead>
          <tr>
            <th onClick={() => handleSort("userName")}>Пользователь</th>
            <th onClick={() => handleSort("totalLateCount")}>
              Кол-во опозданий
            </th>
            <th onClick={() => handleSort("totalLateMinutes")}>
              Общее время опозданий
            </th>
            <th onClick={() => handleSort("workingDaysCount")}>Рабочие дни</th>
            <th onClick={() => handleSort("totalWorkingTime")}>Время работы</th>
          </tr>
        </thead>
        <tbody>
          {sortedStats.map((uStat) => (
            <tr key={uStat.userId}>
              <td>{uStat.userName}</td>
              <td>{uStat.totalLateCount}</td>
              <td>{formatDuration(uStat.totalLateMinutes)}</td>
              <td>{uStat.workingDaysCount}</td>
              <td>{formatDuration(uStat.totalWorkingTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Records({ filter }) {
  const { theme } = useTheme();
  const companyName = localStorage.getItem("companyName");

  // Загрузка данных из Excel
  const {
    data: schedulesData,
    loading: schedulesLoading,
    error: schedulesError,
  } = useExcelData(`/${companyName}/${companyName}Schedule.xlsx`);

  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
  } = useExcelData(`/${companyName}/${companyName}.xlsx`);

  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useExcelData(`/${companyName}/${companyName}User.xlsx`);

  // Фильтрация событий по диапазону дат из filter
  const filteredEventsData = useMemo(() => {
    if (!eventsData) return [];
    const { start, end } = getDateRange(filter);
    return eventsData.filter((ev) => {
      const eventDate = parseDateDMY(ev.eventDate);
      return eventDate >= start && eventDate < end;
    });
  }, [eventsData, filter]);

  // Преобразование расписаний
  const scheduleList = useMemo(() => {
    return schedulesData
      ? schedulesData.map((sch) => ({
          id: String(sch.id),
          scheduleName: sch.name || "",
          scheduleType: Number(sch.scheduleType) || 1,
          startTime: sch.startTime || "",
          endTime: sch.endTime || "",
          selectedDays: sch.selectedDays
            ? sch.selectedDays.split(",").map((d) => d.trim())
            : [],
          userInThisSchedule: sch.userInThisSchedule
            ? sch.userInThisSchedule
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean)
            : [],
        }))
      : [];
  }, [schedulesData]);

  // Группируем отфильтрованные события по userId (здесь в поле id указан id пользователя)
  const eventsByUser = useMemo(() => {
    const res = {};
    if (filteredEventsData) {
      for (const ev of filteredEventsData) {
        const userId = String(ev.id || "");
        if (!userId) continue;
        if (!res[userId]) res[userId] = [];
        res[userId].push(ev);
      }
    }
    return res;
  }, [filteredEventsData]);

  // Создаем мапу пользователей по id
  const usersMap = useMemo(() => {
    return usersData
      ? new Map(usersData.map((u) => [String(u.id), u]))
      : new Map();
  }, [usersData]);

  // Формирование итогового отчёта
  const finalReport = useMemo(() => {
    const report = [];

    for (const schedule of scheduleList) {
      const {
        id,
        scheduleName,
        scheduleType,
        startTime,
        endTime,
        selectedDays,
        userInThisSchedule,
      } = schedule;
      const usersStats = [];

      for (const userId of userInThisSchedule) {
        const user = usersMap.get(userId);
        const userName = user ? user.name : `User #${userId}`;
        const userEvents = eventsByUser[userId] || [];

        let totalLateCount = 0;
        let totalLateMinutes = 0;
        let workingDaysCount = 0;
        let totalWorkingTime = 0;

        for (const ev of userEvents) {
          let isWorkingDay = true;
          let plannedStart = "";
          let plannedEnd = "";

          if (scheduleType === 1) {
            const dayAbbr = getDayAbbr(ev.eventDate);
            if (!selectedDays.includes(dayAbbr)) {
              isWorkingDay = false;
            } else {
              plannedStart = startTime.slice(0, 5);
              plannedEnd = endTime.slice(0, 5);
            }
          } else if (scheduleType === 2) {
            if (ev.startSchedule && ev.endSchedule) {
              plannedStart = ev.startSchedule.slice(0, 5);
              plannedEnd = ev.endSchedule.slice(0, 5);
            } else {
              // Свободный день: план не задан, опоздания не считаем
              plannedStart = "";
              plannedEnd = "";
            }
          }

          if (!isWorkingDay) continue;

          // Расчет рабочего времени
          workingDaysCount += 1;
          let eventWorkMinutes = 0;
          if (ev.duration) {
            eventWorkMinutes = parseDuration(ev.duration);
          } else {
            const actualStartTime = extractTime(ev.startWorkTime);
            const actualEndTime = extractTime(ev.endWorkTime);
            if (actualStartTime && actualEndTime) {
              eventWorkMinutes =
                parseTime(actualEndTime) - parseTime(actualStartTime);
            }
          }
          totalWorkingTime += eventWorkMinutes;

          // Расчет опозданий
          let planStartMins = 0;
          let canCalculateLateness = false;
          if (scheduleType === 1) {
            canCalculateLateness = true;
            planStartMins = parseTime(startTime.slice(0, 5));
          } else if (scheduleType === 2 && ev.startSchedule && ev.endSchedule) {
            canCalculateLateness = true;
            planStartMins = parseTime(ev.startSchedule.slice(0, 5));
          }
          if (canCalculateLateness) {
            const actualStart = extractTime(ev.startWorkTime);
            if (actualStart) {
              const actualStartMins = parseTime(actualStart);
              if (actualStartMins > planStartMins) {
                const diff = actualStartMins - planStartMins;
                totalLateCount += 1;
                totalLateMinutes += diff;
              }
            }
          }
        }

        usersStats.push({
          userId,
          userName,
          totalLateCount,
          totalLateMinutes,
          workingDaysCount,
          totalWorkingTime,
        });
      }

      report.push({
        scheduleId: id,
        scheduleName,
        scheduleType,
        usersStats,
      });
    }

    return report;
  }, [scheduleList, eventsByUser, usersMap]);

  if (schedulesLoading || eventsLoading || usersLoading) {
    return <div>Загрузка данных...</div>;
  }
  if (schedulesError || eventsError || usersError) {
    return (
      <div>
        {schedulesError && <p>Ошибка расписаний: {schedulesError.message}</p>}
        {eventsError && <p>Ошибка событий: {eventsError.message}</p>}
        {usersError && <p>Ошибка пользователей: {usersError.message}</p>}
      </div>
    );
  }

  return (
    <div
      className={`${styles.recordsContainer} ${
        theme === "dark" ? styles.darkMode : ""
      }`}
    >
      <h2 className={styles.title}>Отчеты</h2>
      {finalReport.map((sch) => (
        <ScheduleReport key={sch.scheduleId} schedule={sch} />
      ))}
    </div>
  );
}
