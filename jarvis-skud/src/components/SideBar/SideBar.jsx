import React, { useState } from "react";
import cn from "classnames";
import styles from "./SideBar.module.sass";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useThemeContext";

function SideBar({ children }) {
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const { theme } = useTheme();

  return (
    <div className={styles.wrapper}>
      <div
        className={cn(styles.sidebar, {
          [styles.hidden]: isSidebarHidden,
          [styles.darkSidebar]: theme === "dark",
        })}
      >
        <img
          className={styles["bars"]}
          src={
            theme === "dark" ? "img/list-solid.svg" : "img/list-solid-black.svg"
          }
          alt="bars-jarvis"
          onClick={() => setIsSidebarHidden(!isSidebarHidden)}
        />
        <div className={styles["header"]}>
          <div className={styles["links"]}>
            <Link to="/" className={styles["link"]}>
              Отчеты
            </Link>
            <Link to="/">
              <img
                className={styles["link__img"]}
                src={theme === "dark" ? "img/home.svg" : "img/home-black.svg"}
                alt="jarvis__home"
              />
            </Link>
          </div>
          <div className={styles["links"]}>
            <Link to="/schedule" className={styles["link"]}>
              Расписание
            </Link>
            <Link to="/schedule">
              <img
                className={styles["link__img"]}
                src={
                  theme === "dark"
                    ? "img/calendar.svg"
                    : "img/calendar-black.svg"
                }
                alt="jarvis__home"
              />
            </Link>
          </div>
          <div className={styles["links"]}>
            <Link to="/settings" className={styles["link"]}>
              Настройки
            </Link>
            <Link to="/settings">
              <img
                className={styles["link__img"]}
                src={
                  theme === "dark"
                    ? "img/settings.svg"
                    : "img/settings-black.svg"
                }
                alt="jarvis__home"
              />
            </Link>
          </div>
          <div className={styles["links"]}>
            <Link to="/info" className={styles["link"]}>
              Инфо
            </Link>
            <Link to="/info">
              <img
                className={styles["link__img"]}
                src={theme === "dark" ? "img/info.svg" : "img/info-black.svg"}
                alt="jarvis__home"
              />
            </Link>
          </div>
        </div>
        <div className={styles["logo"]}>
          <Link to="https://jarvis.kg/">
            <img
              src={
                theme === "dark" ? "img/jarvisWhite.png" : "img/jarvisBlack.png"
              }
              alt="Jarvis"
              className={styles["logo__img"]}
            />
          </Link>
        </div>
      </div>
      <main
        className={cn(styles["page-face"], {
          [styles["more-width"]]: isSidebarHidden,
          [styles.darkPage]: theme === "dark",
        })}
      >
        {children}
      </main>
    </div>
  );
}

export default SideBar;
