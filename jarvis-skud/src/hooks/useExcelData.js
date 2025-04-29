import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

function extractTime(dateTimeStr) {
  // Предполагаем, что формат: "DD.MM.YYYY HH:MM:SS"
  return dateTimeStr.split(" ")[1];
}

function parseDate(dateStr) {
  const parts = dateStr.split(".");
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

export default function useExcelData(url, transformData) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        let jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Если передана функция трансформации, применяем её
        if (typeof transformData === "function") {
          jsonData = transformData(jsonData);
        }

        setData(jsonData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [url, transformData]);

  return { data, loading, error };
}
