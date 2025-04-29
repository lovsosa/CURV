import React, { useState } from "react";
import styles from "./DashboardList.module.sass";
import cn from "classnames";
import Btn from "../UI/Btn";

function Dashboard({
  userId,
  userName,
  startWorkTime,
  endWorkTime,
  duration,
  date,
  status,
  pause,
}) {
  const [cart, setCart] = useState(false);
  return (
    <div className={styles["item"]}>
      <span className={styles["item__content"]}>
        <span>{userName}</span>
      </span>
      <span className={styles["item__content"]}>
        <span>{date}</span>
      </span>
      <span className={styles["item__content"]}>
        <span>{startWorkTime}</span>
      </span>
      <span className={styles["item__content"]}>
        <span>{endWorkTime}</span>
      </span>
      <Btn
        style={{ width: "50%", margin: "0 auto" }}
        click={() => setCart(!cart)}
      >
        Подробнее
      </Btn>
      {cart ? (
        <>
          <div className={styles["cart"]}>
            <h3 className={styles["cart__title"]}>{userName}</h3>
            <p className={styles["cart__content"]}>
              ID Сотрудника: <span>{userId}</span>
            </p>
            <p className={styles["cart__content"]}>
              Дата: <span>{date}</span>
            </p>
            <p className={styles["cart__content"]}>
              Начало работы: <span>{startWorkTime}</span>
            </p>
            <p className={styles["cart__content"]}>
              Конец работы: <span>{endWorkTime}</span>
            </p>
            <p className={styles["cart__content"]}>
              Время перерыва: <span>{pause} мин</span>
            </p>
            <p className={styles["cart__content"]}>
              Время работы: <span>{duration}</span>
            </p>
            <p className={styles["cart__content"]}>
              Статус: <span>{status}</span>
            </p>
            <Btn click={() => setCart(!cart)}>Назад</Btn>
          </div>
          <div
            onClick={() => setCart(!cart)}
            className={styles["backdrop"]}
          ></div>
        </>
      ) : null}
    </div>
  );
}

export default Dashboard;
