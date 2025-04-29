import React from "react";
import styles from "./MainDashboard.module.sass";
import DayCart from "./DayCart";
import cn from "classnames";
import { useTheme } from "../../hooks/useThemeContext";

// Преобразование строки даты "DD.MM.YYYY" в объект Date
function parseEventDate(dateStr) {
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
}

function MainDashboard({
  employee,
  events,
  headerDays,
  plannedStart,
  plannedEnd,
  scheduleType,
}) {
  const { theme } = useTheme();
  return (
    <div
      className={cn(styles["dashboard-row"], {
        [styles.darkMode]: theme === "dark",
      })}
    >
      <div className={styles["employee-name"]}>{employee}</div>
      {headerDays.map((dayObj) => {
        const eventForDay = events.find((event) => {
          const eventDate = parseEventDate(event.eventDate);
          return eventDate.getTime() === dayObj.date.getTime();
        });
        return (
          <DayCart
            key={dayObj.formatted}
            day={dayObj.formatted}
            employee={employee}
            eventForDay={eventForDay}
            plannedStart={
              scheduleType === "2"
                ? (eventForDay && eventForDay.startSchedule) || ""
                : plannedStart
            }
            plannedEnd={
              scheduleType === "2"
                ? (eventForDay && eventForDay.endSchedule) || ""
                : plannedEnd
            }
          />
        );
      })}
    </div>
  );
}

export default MainDashboard;
