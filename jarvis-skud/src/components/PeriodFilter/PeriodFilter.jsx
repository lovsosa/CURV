import React, { useState, useEffect } from "react";
import styles from "./PeriodFilter.module.sass";
import { useTheme } from "../../hooks/useThemeContext";
import cn from "classnames";

const periodOptions = [
  { value: "currentDay", label: "Текущий день" },
  { value: "currentWeek", label: "Текущая неделя" },
  { value: "currentMonth", label: "Текущий месяц" },
  { value: "currentQuarter", label: "Текущий квартал" },
  { value: "last7Days", label: "Последние 7 дней" },
  { value: "last30Days", label: "Последние 30 дней" },
  { value: "last90Days", label: "Последние 90 дней" },
  { value: "custom", label: "Диапазон" },
];

function PeriodFilter({ filter, onFilterChange }) {
  const { theme } = useTheme();
  const [customStart, setCustomStart] = useState(filter.start || "");
  const [customEnd, setCustomEnd] = useState(filter.end || "");
  const [error, setError] = useState("");

  // Если filter изменяется и период custom, синхронизируем состояния
  useEffect(() => {
    if (filter.period === "custom") {
      setCustomStart(filter.start || "");
      setCustomEnd(filter.end || "");
    }
  }, [filter]);

  const handlePeriodChange = (e) => {
    const period = e.target.value;
    setError(""); // сбрасываем ошибку при изменении периода
    // Если выбран не custom, сбрасываем даты
    if (period !== "custom") {
      onFilterChange({ period, start: null, end: null });
    } else {
      // Для custom оставляем текущие значения
      onFilterChange({ period, start: customStart, end: customEnd });
    }
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) {
      setError("Пожалуйста, выберите обе даты.");
      return;
    }

    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);

    if (startDate > endDate) {
      setError("Начальная дата не может быть позже конечной.");
      return;
    }

    setError(""); // Сбрасываем ошибку, если валидация прошла успешно
    onFilterChange({ period: "custom", start: customStart, end: customEnd });
  };

  return (
    <div
      className={cn(styles["period-filter"], {
        [styles.darkMode]: theme === "dark",
      })}
    >
      <select
        className={styles["period-filter__select"]}
        value={filter.period}
        onChange={handlePeriodChange}
      >
        {periodOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {filter.period === "custom" && (
        <div
          className={cn(styles["period-filter__custom"], {
            [styles.customDarkMode]: theme === "dark",
          })}
        >
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            placeholder="Начальная дата"
          />
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            placeholder="Конечная дата"
          />
          <button onClick={handleCustomApply}>Применить</button>
        </div>
      )}

      {error && <div className={styles["period-filter__error"]}>{error}</div>}
    </div>
  );
}

export default PeriodFilter;
