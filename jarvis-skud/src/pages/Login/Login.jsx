import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.sass";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Ошибка при логине");
      }

      const { token } = await response.json();
      // Сохраняем токен для последующих запросов
      localStorage.setItem("jwtToken", token);
      localStorage.setItem("authenticated", "true");

      navigate("/");
    } catch (err) {
      console.error("Login error", err);
      setError(err.message);
    }
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
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

export default Login;
