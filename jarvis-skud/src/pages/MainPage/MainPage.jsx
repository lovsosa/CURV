import React, { useState, useMemo, useEffect } from "react";
import styles from "./MainPage.module.sass";
import useExcelData from "../../hooks/useExcelData";
import useExcelEvent from "../../hooks/useExcelEvent";
import MainDashboard from "../../components/MainDashboard/MainDashboard";
import { useTheme } from "../../hooks/useThemeContext";
import cn from "classnames";

// Преобразование строки даты "DD.MM.YYYY" в объект Date
function parseEventDate(dateStr) {
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
}

// Получение диапазона дат по выбранному фильтру
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

// Генерация заголовков дней (например, "Пн 08 Авг")
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
  const d = new Date(start);
  while (d < end) {
    const formatted =
      daysOfWeek[d.getDay()] +
      " " +
      (d.getDate() < 10 ? "0" + d.getDate() : d.getDate()) +
      " " +
      months[d.getMonth()];
    headerDays.push({
      formatted,
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    });
    d.setDate(d.getDate() + 1);
  }
  return headerDays;
}

// Парсинг значения userInThisSchedule (строка "1,2,3," или массив)
function parseUserIds(value) {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "");
  }
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function MainPage({ filter }) {
  const [localFilter, setLocalFilter] = useState(filter);
  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);
  const companyName = localStorage.getItem("companyName");
  // Загружаем расписания (testSchedule.xlsx)
  const {
    data: schedulesData,
    loading: schedulesLoading,
    error: schedulesError,
  } = useExcelData(`/${companyName}/${companyName}Schedule.xlsx`);
  // Загружаем пользователей (testUser.xlsx)
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useExcelData(`/${companyName}/${companyName}User.xlsx`);
  // Загружаем события (test.xlsx)
  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
  } = useExcelEvent(`/${companyName}/${companyName}.xlsx`);

  const { theme } = useTheme();

  if (schedulesLoading || usersLoading || eventsLoading)
    return <div>Загрузка...</div>;
  if (schedulesError)
    return <div>Ошибка загрузки расписаний: {schedulesError.message}</div>;
  if (usersError)
    return <div>Ошибка загрузки пользователей: {usersError.message}</div>;
  if (eventsError)
    return <div>Ошибка загрузки событий: {eventsError.message}</div>;

  const { start, end } = getDateRange(localFilter);
  const headerDays = generateHeaderDays(start, end);

  // Фильтруем события по диапазону дат
  const filteredEvents = events.filter((event) => {
    const eventDate = parseEventDate(event.eventDate);
    return eventDate >= start && eventDate < end;
  });

  // Группируем события по сотрудникам (по userName)
  const eventsByUser = filteredEvents.reduce((acc, event) => {
    const key = event.userName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
  console.log(schedulesData);

  return schedulesData.length > 0 ? (
    <div
      className={cn(styles["dashboard-list"], {
        [styles.darkMode]: theme === "dark",
      })}
    >
      {headerDays.length > 0 && (
        <div className={styles["dashboard__title"]}>
          <span>Сотрудник</span>
          {headerDays.map((dayObj) => (
            <span key={dayObj.formatted}>{dayObj.formatted}</span>
          ))}
        </div>
      )}
      {schedulesData.map((schedule) => {
        // Для каждого расписания получаем список id пользователей
        const userIds = parseUserIds(schedule.userInThisSchedule);
        // Находим сотрудников по этим id
        const employees = usersData.filter((user) =>
          userIds.includes(String(user.id))
        );
        return (
          <div key={schedule.id} className={styles["dashboard-group"]}>
            <div className={styles["dashboard-scroll-container"]}>
              <span className={styles["dashboard-group__title"]}>
                {schedule.name}
              </span>
              {employees.length > 0 ? (
                employees.map((employee) => {
                  const employeeEvents = eventsByUser[employee.name] || [];
                  let plannedStartForEmployee = schedule.startTime;
                  let plannedEndForEmployee = schedule.endTime;
                  if (Number(schedule.scheduleType) === 2) {
                    return (
                      <MainDashboard
                        key={employee.id}
                        employee={employee.name}
                        events={employeeEvents}
                        headerDays={headerDays}
                        scheduleType="2"
                      />
                    );
                  } else {
                    return (
                      <MainDashboard
                        key={employee.id}
                        employee={employee.name}
                        events={employeeEvents}
                        headerDays={headerDays}
                        scheduleType="1"
                        plannedStart={plannedStartForEmployee}
                        plannedEnd={plannedEndForEmployee}
                      />
                    );
                  }
                })
              ) : (
                <p className={styles["dashboard-group__noEmployees"]}>
                  Нет сотрудников для этого расписания
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div
      className={cn(styles.empty, { [styles.emptyDarkMode]: theme === "dark" })}
    >
      <h2 className={styles.empty__title}>Нету актуальных данных</h2>
    </div>
  );
}

export default MainPage;
