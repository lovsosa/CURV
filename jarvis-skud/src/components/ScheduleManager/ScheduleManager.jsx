import React from "react";
import { Box, Button, TextField, useTheme } from "@mui/material";

function ScheduleManager({
  schedules,
  addSchedule,
  updateScheduleName,
  removeSchedule,
  openConfigDialog,
  saveSchedulesToExcel,
}) {
  // Задаём единый размер для всех элементов
  const commonWidth = "250px";
  const commonHeight = "50px";
  const { theme } = useTheme();
  const baseStyles = {
    color: "#FFFFFF",
    bgcolor: "#1A5883",
    fontFamily: "sans-serif",
    width: commonWidth,
    height: commonHeight,
    "&:hover": {
      bgcolor: "rgba(26, 88, 131)",
      color: "#FFFFFF",
    },
  };

  return (
    <>
      <h3>Настроить расписание</h3>

      {schedules.map((schedule, index) => (
        <Box
          key={schedule.id}
          sx={{ display: "flex", alignItems: "center", mt: 2, gap: 2 }}
        >
          <TextField
            label="Название расписания"
            variant="outlined"
            value={schedule.name}
            onChange={(e) => updateScheduleName(index, e.target.value)}
            sx={{
              width: "515px",
              "& .MuiInputBase-root": { height: commonHeight },
              "& .MuiInputBase-input": {
                color: "#8C8C8C",
              },
              "& .MuiInputLabel-root": {
                color: "#8C8C8C",
                fontFamily: "sans-serif",
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#8C8C8C",
                fontFamily: "sans-serif",
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#8C8C8C" },
                "&:hover fieldset": { borderColor: "#1A5883" },
                "&.Mui-focused fieldset": { borderColor: "#1A5883" },
              },
            }}
          />

          <Button
            sx={{
              bgcolor: "#1A5883",
              fontFamily: "sans-serif",
              width: commonWidth,
              height: commonHeight,
            }}
            variant="contained"
            onClick={() => openConfigDialog(index)}
          >
            Настроить
          </Button>
          <Button
            sx={{
              ...baseStyles,
            }}
            variant="contained"
            onClick={() => removeSchedule(index)}
          >
            Удалить
          </Button>
        </Box>
      ))}

      <Box sx={{ display: "flex", alignItems: "center", mt: 3, gap: 2 }}>
        <Button
          sx={{
            bgcolor: "#1A5883",
            fontFamily: "sans-serif",
            width: commonWidth,
            height: commonHeight,
          }}
          variant="contained"
          onClick={saveSchedulesToExcel}
        >
          Сохранить
        </Button>{" "}
        <Button
          sx={{
            bgcolor: "#1A5883",
            fontFamily: "sans-serif",
            width: commonWidth,
            height: commonHeight,
          }}
          variant="contained"
          onClick={addSchedule}
        >
          Добавить расписание
        </Button>
      </Box>
    </>
  );
}

export default ScheduleManager;
