import React, { useState, useMemo } from "react";
import styles from "./ListDashboard.module.sass";
import useExcelData from "../../hooks/useExcelData";
import PeriodFilter from "../../components/PeriodFilter/PeriodFilter";
import Dashboard from "../../components/DashboardList/DashboardList";

function groupEventsByDate(events) {
  return events.reduce((acc, event) => {
    const date = event.eventDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});
}

function parseEventDate(dateStr) {
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
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

function ListDashboard({ filter }) {
  const companyName = localStorage.getItem("companyName");
  const {
    data: events,
    loading,
    error,
  } = useExcelData(`/${companyName}/${companyName}.xlsx`);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const { start, end } = getDateRange(filter);
    return events.filter((event) => {
      const eventDate = parseEventDate(event.eventDate);
      return eventDate >= start && eventDate < end;
    });
  }, [events, filter]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error.message}</div>;

  const groupedEvents = groupEventsByDate(filteredEvents);

  return (
    <div className={styles["dashboard-list"]}>
      {Object.keys(groupedEvents).map((date) => (
        <div key={date} className={styles["dashboard-list__item"]}>
          <h2 className={styles["list__title"]}>{date}</h2>{" "}
          <div className={styles["item"]}>
            <span className={styles["item__content"]}>Дата</span>
            <span className={styles["item__content"]}>Имя</span>
            <span className={styles["item__content"]}>Начало работы</span>
            <span className={styles["item__content"]}>Конец работы</span>
            <span className={styles["item__content"]}>Инфо</span>
          </div>
          {groupedEvents[date].map((event) => (
            <Dashboard
              key={event.id}
              userId={event.id}
              userName={event.userName}
              startWorkTime={event.startWorkTime}
              endWorkTime={event.endWorkTime}
              pause={event.pause}
              duration={event.duration}
              date={event.eventDate}
              status={event.status}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default ListDashboard;
