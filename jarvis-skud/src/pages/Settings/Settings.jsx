import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import ThemeSwitcher from "../../components/ThemeSwitcher/ThemeSwitcher";
import useExcelData from "../../hooks/useExcelData";
import styles from "./Settings.module.sass";
import ScheduleManager from "../../components/ScheduleManager/ScheduleManager";
import ScheduleDialog from "../../components/ScheduleDialog/ScheduleDialog";
import { useTheme } from "../../hooks/useThemeContext";
import useServerData from "../../hooks/useServerData";
import cn from "classnames";

// ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================
const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const parseTime = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

const formatDuration = (minutes) => {
  if (minutes < 0) return "0ч 0м";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}ч ${m}м`;
};

const toArray = (value) => {
  if (value == null) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }
  if (Array.isArray(value)) {
    return value.map((val) => String(val).trim()).filter((s) => s !== "");
  }
  return [String(value).trim()].filter((s) => s !== "");
};

// ======================== ТРАНСФОРМАЦИЯ РАСПИСАНИЙ ========================
const transformScheduleData = (data) =>
  data
    .filter((row) => row.id && String(row.id).trim() !== "")
    .map((sch) => ({
      id: sch.id,
      name: sch.name,
      userInThisSchedule: toArray(sch.userInThisSchedule),
      scheduleType:
        sch.scheduleType == 1
          ? "Фиксированный"
          : sch.scheduleType == 2
          ? "Посменный"
          : "",
      shiftId: toArray(sch.shiftId),
      startTime: sch.startTime ? String(sch.startTime).trim() : "",
      endTime: sch.endTime ? String(sch.endTime).trim() : "",
      breakTime: sch.breakTime ? String(sch.breakTime).trim() : "",
      selectedDays: toArray(sch.selectedDays),
    }));

// ======================== ТРАНСФОРМАЦИЯ СМЕН ========================
const transformShiftData = (data) =>
  data
    .filter((row) => row.id && String(row.id).trim() !== "")
    .map((sh) => ({
      id: sh.id,
      name: sh.name || "",
      startTime: sh.startTime ? String(sh.startTime).trim() : "",
      endTime: sh.endTime ? String(sh.endTime).trim() : "",
      breakTime: sh.breakTime ? String(sh.breakTime).trim() : "",
    }));

function Settings() {
  // Тема (светлая/тёмная)
  const { theme, toggleTheme } = useTheme();
  const companyName = localStorage.getItem("companyName");

  // Загружаем данные расписаний, пользователей, смен
  const {
    data: loadedSchedules,
    loading: schedulesLoading,
    error: schedulesError,
  } = useExcelData(
    `/${companyName}/${companyName}Schedule.xlsx`,
    transformScheduleData
  );
  const [schedules, setSchedules] = useState([]);
  const {
    data: loadedUsers,
    loading: usersLoading,
    error: usersError,
  } = useExcelData(`/${companyName}/${companyName}User.xlsx`);
  const filteredUsers = loadedUsers
    ? loadedUsers.filter((u) => u.id && String(u.id).trim() !== "")
    : [];
  const {
    data: loadedShifts,
    loading: shiftsLoading,
    error: shiftsError,
  } = useExcelData(
    `/${companyName}/${companyName}Shift.xlsx`,
    transformShiftData
  );
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    if (loadedSchedules && loadedSchedules.length > 0)
      setSchedules(loadedSchedules);
  }, [loadedSchedules]);
  useEffect(() => {
    if (loadedShifts && loadedShifts.length > 0) setShifts(loadedShifts);
  }, [loadedShifts]);

  // Сохранение и применение темы
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.body.className = theme === "dark" ? "dark-theme" : "";
  }, [theme]);

  // Инициализируем хук для отправки данных на сервер
  const {
    sendData,
    loading: sending,
    error: sendError,
    responseData,
  } = useServerData("https://jarvis.ngrok.pro/data-update");

  // ======================== ФУНКЦИИ УПРАВЛЕНИЯ РАСПИСАНИЯМИ ========================
  const addSchedule = () => {
    setSchedules((prev) => {
      const maxId =
        prev.length > 0 ? Math.max(...prev.map((s) => Number(s.id))) : 0;
      const newId = String(maxId + 1);
      return [
        ...prev,
        {
          id: newId,
          name: "",
          userInThisSchedule: [],
          scheduleType: "Фиксированный",
          shiftId: [],
          startTime: "09:00",
          endTime: "18:00",
          breakTime: "01:00",
          selectedDays: ["Пн", "Вт", "Ср", "Чт", "Пт"],
        },
      ];
    });
  };

  const updateScheduleName = (index, value) => {
    setSchedules((prev) => {
      const newSchedules = [...prev];
      newSchedules[index] = { ...newSchedules[index], name: value };
      return newSchedules;
    });
  };

  const removeSchedule = (index) => {
    setSchedules((prev) => {
      const newSchedules = prev.filter((_, i) => i !== index);
      const usedShiftIds = new Set();
      newSchedules.forEach((sch) => {
        (sch.shiftId || []).forEach((id) => usedShiftIds.add(String(id)));
      });
      setShifts((prevShifts) =>
        prevShifts.filter((sh) => usedShiftIds.has(String(sh.id)))
      );
      return newSchedules;
    });
  };

  // ======================== УПРАВЛЕНИЕ ДИАЛОГОМ НАСТРОЙКИ РАСПИСАНИЯ ========================
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(null);
  const [scheduleConfig, setScheduleConfig] = useState({});
  const [backupShifts, setBackupShifts] = useState([]);

  const openConfigDialog = (index) => {
    setActiveScheduleIndex(index);
    setBackupShifts(shifts.map((s) => ({ ...s })));
    const scheduleToEdit = JSON.parse(JSON.stringify(schedules[index]));
    setScheduleConfig(scheduleToEdit);
  };

  const closeConfigDialog = (saved = false) => {
    if (!saved) {
      setShifts(backupShifts);
    }
    setActiveScheduleIndex(null);
    setScheduleConfig({});
    setBackupShifts([]);
  };

  const saveScheduleConfig = () => {
    if (activeScheduleIndex !== null) {
      const newSchedules = [...schedules];
      newSchedules[activeScheduleIndex] = { ...scheduleConfig };
      setSchedules(newSchedules);
      const usedShiftIds = new Set();
      newSchedules.forEach((sch) => {
        (sch.shiftId || []).forEach((id) => usedShiftIds.add(String(id)));
      });
      setShifts((prevShifts) =>
        prevShifts.filter((sh) => usedShiftIds.has(String(sh.id)))
      );
      closeConfigDialog(true);
    }
  };

  // ======================== ПРОЧИЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================
  const computeDuration = (startTime, endTime, breakTime) => {
    let start = parseTime(startTime);
    let end = parseTime(endTime);
    if (end < start) {
      end += 24 * 60;
    }
    const breakMins = parseTime(breakTime);
    const total = end - start - breakMins;
    return formatDuration(total);
  };

  const handleDayChange = (day, checked) => {
    setScheduleConfig((prev) => {
      const newSelectedDays = checked
        ? [...prev.selectedDays, day]
        : prev.selectedDays.filter((d) => d !== day);
      return { ...prev, selectedDays: newSelectedDays };
    });
  };

  // ======================== ИЗМЕНЕНИЕ ТИПА РАСПИСАНИЯ ========================
  const handleScheduleTypeChange = (newType) => {
    setScheduleConfig((prev) => {
      const updated = { ...prev, scheduleType: newType };
      if (newType === "Фиксированный") {
        updated.shiftId = [];
        updated.startTime = updated.startTime || "09:00";
        updated.endTime = updated.endTime || "18:00";
        updated.breakTime = updated.breakTime || "01:00";
        updated.selectedDays =
          updated.selectedDays && updated.selectedDays.length > 0
            ? updated.selectedDays
            : ["Пн", "Вт", "Ср", "Чт", "Пт"];
      } else if (newType === "Посменный") {
        updated.startTime = "";
        updated.endTime = "";
        updated.breakTime = "";
        updated.selectedDays = [];
        if (!updated.shiftId || updated.shiftId.length === 0) {
          const newId = (() => {
            const maxId =
              shifts.length > 0
                ? Math.max(...shifts.map((s) => Number(s.id)))
                : 0;
            return String(maxId + 1);
          })();
          updated.shiftId = [newId];
          setShifts((prevShifts) => {
            if (prevShifts.some((sh) => String(sh.id) === newId)) {
              return prevShifts;
            }
            return [
              ...prevShifts,
              {
                id: newId,
                name: "",
                startTime: "",
                endTime: "",
                breakTime: "",
              },
            ];
          });
        }
      }
      return updated;
    });
  };

  // ======================== СОХРАНЕНИЕ РАСПИСАНИЙ ========================
  const saveSchedulesToExcel = async () => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      console.error("ID компании не найден в localStorage");
      return;
    }

    // Создаём копию смен и обновляем её так, чтобы каждому расписанию с типом "Посменный"
    // были присвоены уникальные shiftId.
    const updatedShifts = [...shifts];
    let currentMaxShiftId =
      updatedShifts.length > 0
        ? Math.max(...updatedShifts.map((s) => Number(s.id)))
        : 0;

    const updatedSchedules = schedules.map((schedule) => {
      if (schedule.scheduleType === "Посменный") {
        if (!schedule.shiftId || schedule.shiftId.length === 0) {
          currentMaxShiftId++;
          const newId = String(currentMaxShiftId);
          schedule.shiftId = [newId];
          if (!updatedShifts.find((s) => String(s.id) === newId)) {
            updatedShifts.push({
              id: newId,
              name: "",
              startTime: "",
              endTime: "",
              breakTime: "",
            });
          }
        } else {
          schedule.shiftId = schedule.shiftId.map((id) => {
            const exists = updatedShifts.find(
              (s) => String(s.id) === String(id)
            );
            if (!exists) {
              currentMaxShiftId++;
              const newId = String(currentMaxShiftId);
              updatedShifts.push({
                id: newId,
                name: "",
                startTime: "",
                endTime: "",
                breakTime: "",
              });
              return newId;
            }
            return id;
          });
        }
      }
      return schedule;
    });

    // Обновляем состояние смен, чтобы payload содержал корректный список без дублирования.
    setShifts(updatedShifts);

    const transformedSchedules = updatedSchedules.map((schedule) => {
      const row = {
        id: schedule.id,
        name: schedule.name,
        userInThisSchedule: schedule.userInThisSchedule.join(","),
        scheduleType:
          schedule.scheduleType === "Фиксированный"
            ? 1
            : schedule.scheduleType === "Посменный"
            ? 2
            : "",
      };
      if (schedule.scheduleType === "Фиксированный") {
        row.startTime = schedule.startTime || "";
        row.endTime = schedule.endTime || "";
        row.breakTime = schedule.breakTime || "";
        row.selectedDays = schedule.selectedDays
          ? schedule.selectedDays.join(",")
          : "";
        row.shiftId = "";
      } else {
        row.shiftId = schedule.shiftId ? schedule.shiftId.join(",") : "";
        row.startTime = "";
        row.endTime = "";
        row.breakTime = "";
        row.selectedDays = "";
      }
      return row;
    });

    const payload = {
      companyId,
      schedules: transformedSchedules,
      shifts: updatedShifts,
    };

    console.log("Отправка расписаний с id компании:", payload);
    await sendData(payload);
  };

  // ======================== РЕНДЕР КОМПОНЕНТА ========================
  if (schedulesLoading) return <div>Загрузка расписаний...</div>;
  if (schedulesError) {
    return <div>Ошибка загрузки расписаний: {schedulesError.message}</div>;
  }
  const updateUserInSchedule = (userId, scheduleIndex) => {
    setSchedules((prevSchedules) => {
      const updatedSchedules = prevSchedules.map((schedule, index) => {
        if (index === scheduleIndex) {
          return {
            ...schedule,
            userInThisSchedule: [...schedule.userInThisSchedule, userId],
          };
        } else {
          return {
            ...schedule,
            userInThisSchedule: schedule.userInThisSchedule.filter(
              (id) => id !== userId
            ),
          };
        }
      });

      return updatedSchedules;
    });
  };
  return (
    <div
      className={cn(styles.settings, { [styles.darkMode]: theme === "dark" })}
    >
      <Box className={styles.settings__container}>
        <h3>Настройки сайта</h3>
        <ThemeSwitcher theme={theme} onToggleTheme={toggleTheme} />

        {/* Компонент управления расписаниями */}
        <ScheduleManager
          schedules={schedules}
          addSchedule={addSchedule}
          updateScheduleName={updateScheduleName}
          removeSchedule={removeSchedule}
          openConfigDialog={openConfigDialog}
          saveSchedulesToExcel={saveSchedulesToExcel}
        />
      </Box>

      {/* Компонент диалогового окна настройки расписания */}
      <ScheduleDialog
        open={activeScheduleIndex !== null}
        scheduleConfig={scheduleConfig}
        shifts={shifts}
        usersLoading={usersLoading}
        usersError={usersError}
        filteredUsers={filteredUsers}
        closeConfigDialog={closeConfigDialog}
        saveScheduleConfig={saveScheduleConfig}
        handleScheduleTypeChange={handleScheduleTypeChange}
        handleDayChange={handleDayChange}
        setScheduleConfig={setScheduleConfig}
        setShifts={setShifts}
        computeDuration={computeDuration}
        updateUserInSchedule={updateUserInSchedule} // Передаем функцию
      />
      {sending && <p>Отправка данных на сервер...</p>}
      {sendError && (
        <p style={{ color: "red" }}>Ошибка отправки: {sendError}</p>
      )}
      {responseData && (
        <p style={{ color: "green" }}>
          Ответ сервера: {JSON.stringify(responseData)}
        </p>
      )}
    </div>
  );
}

export default Settings;
