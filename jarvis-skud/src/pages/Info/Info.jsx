import React from "react";
import styles from "./Info.module.sass";
import { useTheme } from "../../hooks/useThemeContext";
import cn from "classnames";
function Info() {
  const { theme } = useTheme();
  return (
    <div
      className={cn(styles.container, { [styles.darkMode]: theme === "dark" })}
    >
      Версия приложения v.0.3
    </div>
  );
}

export default Info;
