import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "normalize.css";
import "./App.sass";
import Login from "./pages/Login/Login.jsx";
import ListDashboard from "./pages/ListDashboard/ListDashboard.jsx";
import SideBar from "./components/SideBar/SideBar.jsx";
import MainPage from "./pages/MainPage/MainPage.jsx";
import PeriodFilter from "./components/PeriodFilter/PeriodFilter.jsx";
import Navbar from "./components/Navbar/Navbar.jsx";
import Schedule from "./pages/Schedule/Schedule.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import { ThemeProvider } from "./hooks/useThemeContext.js";
import Records from "./pages/Records/Records.jsx";
import Info from "./pages/Info/Info.jsx";

// Компонент для защиты маршрутов
function PrivateRoute(props) {
  const isAuthenticated = localStorage.getItem("authenticated") === "true";
  return isAuthenticated ? props.children : <Navigate to="/login" />;
}

function App() {
  const [filter, setFilter] = useState({ period: "currentMonth" });

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <ThemeProvider>
                <SideBar>
                  <Navbar />
                  <PeriodFilter filter={filter} onFilterChange={handleFilterChange} />
                  <MainPage filter={filter} />
                </SideBar>
              </ThemeProvider>
            </PrivateRoute>
          }
        />
        <Route
          path="/listDashboard"
          element={
            <PrivateRoute>
              <ThemeProvider>
                <SideBar>
                  <Navbar />
                  <PeriodFilter filter={filter} onFilterChange={handleFilterChange} />
                  <ListDashboard filter={filter} />
                </SideBar>
              </ThemeProvider>
            </PrivateRoute>
          }
        />
        <Route
          path="/records"
          element={
            <PrivateRoute>
              <ThemeProvider>
                <SideBar>
                  <Navbar />
                  <PeriodFilter filter={filter} onFilterChange={handleFilterChange} />
                  <Records filter={filter} />
                </SideBar>
              </ThemeProvider>
            </PrivateRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <PrivateRoute>
              <ThemeProvider>
                <SideBar>
                  <PeriodFilter filter={filter} onFilterChange={handleFilterChange} />
                  <Schedule filter={filter} />
                </SideBar>
              </ThemeProvider>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <ThemeProvider>
                <SideBar>
                  <Settings />
                </SideBar>
              </ThemeProvider>
            </PrivateRoute>
          }
        />
        <Route
          path="/info"
          element={
            <PrivateRoute>
              <ThemeProvider>
                <SideBar>
                  <Info />
                </SideBar>
              </ThemeProvider>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;