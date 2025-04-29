import React from "react";
import styles from "./navbar.module.sass";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useThemeContext";
import cn from "classnames";

function Nabar() {
  const { theme } = useTheme();
  return (
    <div
      className={cn(styles["container"], {
        [styles.darkMode]: theme === "dark",
      })}
    >
      <Link to="/" className={styles["link"]}>
        Календарный отчет
      </Link>
      <Link to="/records" className={styles["link"]}>
        Общие отчеты
      </Link>
    </div>
  );
}

export default Nabar;
