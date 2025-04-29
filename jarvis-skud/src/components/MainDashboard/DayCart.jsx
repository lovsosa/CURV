import React, { useState } from "react";
import styles from "./DayCart.module.sass";
import Btn from "../UI/Btn";
import cn from "classnames";
import { useTheme } from "../../hooks/useThemeContext";

// Функция для парсинга времени "HH:mm" в минуты от начала дня
function parseTimeStringToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Вычисление опоздания: если фактическое время позже планового, возвращается разница, иначе 0
function calculateTardiness(planned, actual) {
  const plannedMinutes = parseTimeStringToMinutes(planned);
  const actualMinutes = parseTimeStringToMinutes(actual);
  return actualMinutes > plannedMinutes ? actualMinutes - plannedMinutes : 0;
}
// Вычисление раннего завершения: если фактическое время окончания меньше планового, возвращается разница, иначе 0
function calculateEarlyFinish(planned, actual) {
  const plannedMinutes = parseTimeStringToMinutes(planned);
  const actualMinutes = parseTimeStringToMinutes(actual);
  return plannedMinutes > actualMinutes ? plannedMinutes - actualMinutes : 0;
}
// Функция для парсинга длительности (например, "8:55" или "8ч 55м")
function parseDuration(durationStr) {
  if (durationStr.includes(":")) {
    const [hours, minutes] = durationStr.split(":").map(Number);
    return hours * 60 + minutes;
  } else {
    const hourMatch = durationStr.match(/(\d+)\s*ч/);
    const minuteMatch = durationStr.match(/(\d+)\s*м/);
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
    return hours * 60 + minutes;
  }
}
// Функция для вычисления длительности работы в минутах с учетом незавершенных ивентов
function calculateDurationForEvent(event) {
  if (!event || !event.startWorkTime) return 0;
  const startMinutes = parseTimeStringToMinutes(event.startWorkTime);
  // Если время окончания задано и не пустое, используем его
  if (event.endWorkTime && event.endWorkTime.trim() !== "") {
    const endMinutes = parseTimeStringToMinutes(event.endWorkTime);
    return endMinutes - startMinutes;
  } else {
    // Если событие не завершено, считаем длительность до текущего момента
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes - startMinutes;
  }
}
function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}ч ${minutes}м`;
}

function DayCart({ day, eventForDay, employee, plannedStart, plannedEnd }) {
  const [cart, setCart] = useState(false);
  const { theme } = useTheme();

  // Вычисляем время опоздания, если есть событие и задано плановое время
  let tardiness = 0;
  if (eventForDay && plannedStart && eventForDay.startWorkTime) {
    tardiness = calculateTardiness(plannedStart, eventForDay.startWorkTime);
  }
  let earlyFinish = 0;
  if (eventForDay && plannedEnd && eventForDay.endWorkTime) {
    earlyFinish = calculateEarlyFinish(plannedEnd, eventForDay.endWorkTime);
  }
  return (
    <>
      <div
        className={cn(styles["employee-event"], {
          [styles["active"]]: eventForDay,
          [styles["late"]]: tardiness > 0,
        })}
        onClick={() => setCart(!cart)}
        key={day}
        data-tardiness={tardiness > 0 ? formatDuration(tardiness) : ""}
      >
        {eventForDay
          ? formatDuration(calculateDurationForEvent(eventForDay))
          : ""}
      </div>
      {eventForDay ? (
        cart ? (
          <>
            <div
              className={cn(styles["cart"], {
                [styles.darkCartMode]: theme === "dark",
              })}
            >
              <h3 className={styles["cart__title"]}>{employee}</h3>
              {/* Новые поля для планового времени */}
              {eventForDay && (
                <>
                  <p className={styles["cart__content"]}>
                    ID Сотрудника: <span>{eventForDay.id}</span>
                  </p>
                  <p className={styles["cart__content"]}>
                    Дата: <span>{eventForDay.eventDate}</span>
                  </p>
                  <>
                    <p className={styles["cart__content"]}>
                      Начало работы: <span>{eventForDay.startWorkTime}</span>
                    </p>
                    {plannedStart ? (
                      <p className={styles["cart__content"]}>
                        Плановое начало работы: <span>{plannedStart}</span>
                      </p>
                    ) : null}
                    <p className={styles["cart__content"]}>
                      Конец работы: <span>{eventForDay.endWorkTime}</span>
                    </p>
                    {plannedEnd ? (
                      <p className={styles["cart__content"]}>
                        Плановый конец работы: <span>{plannedEnd}</span>
                      </p>
                    ) : null}
                    <p className={styles["cart__content"]}>
                      Время работы:{" "}
                      <span>
                        {formatDuration(calculateDurationForEvent(eventForDay))}
                      </span>
                    </p>
                  </>
                </>
              )}
              {/* Поле времени опоздания, если сотрудник пришёл позже */}
              {tardiness > 0 && (
                <p className={styles["cart__content"]}>
                  Время опоздания:{" "}
                  <span className={styles["late-time"]}>
                    {formatDuration(tardiness)}
                  </span>
                </p>
              )}
              {earlyFinish > 0 && (
                <p className={styles["cart__content"]}>
                  Завершил раньше на:{" "}
                  <span className={styles["early-time"]}>
                    {formatDuration(earlyFinish)}
                  </span>
                </p>
              )}
              <Btn click={() => setCart(!cart)}>Назад</Btn>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setCart(!cart);
              }}
              className={styles["backdrop"]}
            ></div>
          </>
        ) : null
      ) : null}
    </>
  );
}

export default DayCart;
