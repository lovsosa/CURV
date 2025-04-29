import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
} from "@mui/material";

const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function ScheduleDialog({
  open,
  scheduleConfig,
  shifts,
  usersLoading,
  usersError,
  filteredUsers,
  closeConfigDialog,
  saveScheduleConfig,
  handleScheduleTypeChange,
  handleDayChange,
  setScheduleConfig,
  setShifts,
  computeDuration,
}) {
  const handleDeleteShift = (id) => {
    // Удаляем смену из массива shifts
    setShifts((prev) => prev.filter((s) => String(s.id) !== String(id)));
    // Удаляем id смены из scheduleConfig.shiftId
    setScheduleConfig((prev) => ({
      ...prev,
      shiftId: (prev.shiftId || []).filter((sid) => String(sid) !== String(id)),
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={() => closeConfigDialog(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ textAlign: "center" }}>
        Настройка расписания
      </DialogTitle>
      <DialogContent dividers>
        {/* Выбор пользователей */}
        {usersLoading ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            Загрузка пользователей...
          </Box>
        ) : usersError ? (
          <Box sx={{ textAlign: "center", py: 2, color: "error.main" }}>
            Ошибка загрузки пользователей: {usersError.message}
          </Box>
        ) : (
          <Select
            multiple
            fullWidth
            variant="outlined"
            value={scheduleConfig.userInThisSchedule || []}
            onChange={(e) =>
              setScheduleConfig((prev) => ({
                ...prev,
                userInThisSchedule: e.target.value,
              }))
            }
            renderValue={(selected) =>
              selected
                .map((id) => {
                  const user = filteredUsers.find(
                    (u) => String(u.id) === String(id)
                  );
                  return user ? user.name : id;
                })
                .join(", ")
            }
            margin="normal"
            sx={{ mb: 2 }}
          >
            {filteredUsers.map((user) => (
              <MenuItem key={user.id} value={String(user.id)}>
                {user.name}
              </MenuItem>
            ))}
          </Select>
        )}

        {/* Переключатель типа расписания */}
        <Select
          fullWidth
          margin="normal"
          value={scheduleConfig.scheduleType || "Фиксированный"}
          onChange={(e) => handleScheduleTypeChange(e.target.value)}
        >
          <MenuItem value="Фиксированный">Фиксированный</MenuItem>
          <MenuItem value="Посменный">Посменный</MenuItem>
        </Select>

        {/* Поля для фиксированного графика */}
        {scheduleConfig.scheduleType === "Фиксированный" && (
          <Box sx={{ mt: 2 }}>
            {/* Дни недели */}
            <Box
              sx={{
                mb: 2,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                justifyContent: "center",
              }}
            >
              {daysOfWeek.map((day) => {
                const checked =
                  scheduleConfig.selectedDays?.includes(day) || false;
                return (
                  <FormControlLabel
                    key={day}
                    label={day}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={(e) => handleDayChange(day, e.target.checked)}
                      />
                    }
                    sx={{ m: 0 }}
                  />
                );
              })}
            </Box>
            {/* Время работы */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                label="Начало"
                type="time"
                value={scheduleConfig.startTime || ""}
                onChange={(e) =>
                  setScheduleConfig((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Конец"
                type="time"
                value={scheduleConfig.endTime || ""}
                onChange={(e) =>
                  setScheduleConfig((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            {/* Перерыв */}
            <TextField
              label="Перерыв"
              type="time"
              value={scheduleConfig.breakTime || ""}
              onChange={(e) =>
                setScheduleConfig((prev) => ({
                  ...prev,
                  breakTime: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              margin="normal"
            />
            {/* Длительность */}
            <TextField
              label="Длительность"
              value={computeDuration(
                scheduleConfig.startTime,
                scheduleConfig.endTime,
                scheduleConfig.breakTime
              )}
              InputProps={{ readOnly: true }}
              fullWidth
              margin="normal"
            />
          </Box>
        )}

        {/* Поля для посменного графика */}
        {scheduleConfig.scheduleType === "Посменный" && (
          <>
            {(scheduleConfig.shiftId || []).map((id, index) => {
              const shift = shifts.find((sh) => String(sh.id) === String(id));
              if (!shift) return null;
              const duration = computeDuration(
                shift.startTime,
                shift.endTime,
                shift.breakTime
              );
              return (
                <Box
                  key={id}
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    mt: 2,
                    boxShadow: 1,
                  }}
                >
                  {/* Заголовок смены с кнопкой удаления */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle1">
                      Смена {index + 1}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleDeleteShift(id)}
                    >
                      Удалить смену
                    </Button>
                  </Box>
                  <TextField
                    label="Название смены"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={shift.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setShifts((prev) =>
                        prev.map((s) =>
                          String(s.id) === String(id)
                            ? { ...s, name: newName }
                            : s
                        )
                      );
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <TextField
                      label="Начало"
                      type="time"
                      value={shift.startTime || ""}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setShifts((prev) =>
                          prev.map((s) =>
                            String(s.id) === String(id)
                              ? { ...s, startTime: newStart }
                              : s
                          )
                        );
                      }}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Конец"
                      type="time"
                      value={shift.endTime || ""}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        setShifts((prev) =>
                          prev.map((s) =>
                            String(s.id) === String(id)
                              ? { ...s, endTime: newEnd }
                              : s
                          )
                        );
                      }}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <TextField
                    label="Перерыв"
                    type="time"
                    value={shift.breakTime || ""}
                    onChange={(e) => {
                      const newBreak = e.target.value;
                      setShifts((prev) =>
                        prev.map((s) =>
                          String(s.id) === String(id)
                            ? { ...s, breakTime: newBreak }
                            : s
                        )
                      );
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Длительность"
                    value={duration}
                    InputProps={{ readOnly: true }}
                    fullWidth
                    margin="normal"
                  />
                </Box>
              );
            })}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  let newId;
                  if (shifts && shifts.length > 0) {
                    newId = String(
                      Math.max(...shifts.map((s) => Number(s.id))) + 1
                    );
                  } else {
                    newId = "1";
                  }
                  setShifts((prev) => [
                    ...prev,
                    {
                      id: newId,
                      name: "",
                      startTime: "",
                      endTime: "",
                      breakTime: "",
                    },
                  ]);
                  setScheduleConfig((prev) => ({
                    ...prev,
                    shiftId: [...(prev.shiftId || []), newId],
                  }));
                }}
              >
                Добавить смену
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", p: 2 }}>
        <Button onClick={() => closeConfigDialog(false)} variant="outlined">
          Отмена
        </Button>
        <Button onClick={saveScheduleConfig} variant="contained">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ScheduleDialog;
