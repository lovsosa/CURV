import React from "react";
import styles from "./UI.module.sass";

function Btn({ children, click, style }) {
  console.log(click);
  return (
    <button style={style} onClick={click} className={styles.btn}>
      {children}
    </button>
  );
}

export default Btn;
