import React from "react";
import { FormControlLabel, Switch } from "@mui/material";

function ThemeSwitcher({ theme, onToggleTheme }) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={theme === "dark"}
          onChange={onToggleTheme}
          color="primary"
        />
      }
      label="Тёмная тема"
      sx={{ marginTop: 2, maxWidth: "160px" }}
    />
  );
}

export default ThemeSwitcher;
