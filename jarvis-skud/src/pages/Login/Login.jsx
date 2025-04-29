import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import "./Login.sass";

function Login() {
  const [companies, setCompanies] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // При монтировании страницы сбрасываем авторизацию и удаляем данные компании
  useEffect(() => {
    localStorage.setItem("authenticated", "false");
    localStorage.removeItem("companyId");
    localStorage.removeItem("companyName");
  }, []);

  // Загружаем данные из Excel при монтировании компонента
  useEffect(() => {
    fetch("/companies.xlsx")
      .then((response) => response.arrayBuffer())
      .then((data) => {
        const workbook = XLSX.read(data, { type: "array" });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setCompanies(jsonData);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке Excel файла", error);
      });
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    // Предполагаем, что в Excel есть столбцы "login" и "password"
    const account = companies.find((company) => {
      return company.login === username && company.password === password;
    });
    if (account) {
      localStorage.setItem("authenticated", "true");
      localStorage.setItem("companyId", account.id);
      localStorage.setItem("companyName", account.name);
      navigate("/");
    } else {
      setError("Неверное имя пользователя или пароль");
    }
  }

  function handleUsernameChange(e) {
    setUsername(e.target.value);
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value);
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Вход в систему</h2>
        <div>
          <label>Имя пользователя:</label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            required
          />
        </div>
        <div>
          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

export default Login;
