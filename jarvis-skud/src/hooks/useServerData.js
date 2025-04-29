import { useState } from 'react';

/**
 * @param {string} url - конечная точка (endpoint) на сервере, куда будут отправляться данные
 */
function useServerData(url) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responseData, setResponseData] = useState(null);

  /**
   * @param {object} payload - объект, который будет сериализован в JSON и отправлен в теле POST-запроса
   */
  const sendData = async (payload) => {
    setLoading(true);
    setError(null);
    setResponseData(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Проверяем, что ответ не вернул ошибку
      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.status} ${response.statusText}`);
      }

      // Считываем ответ (предполагаем, что сервер возвращает JSON)
      const data = await response.json();
      setResponseData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,      // boolean: идёт ли запрос
    error,        // string | null: текст ошибки, если возникла
    responseData, // любой тип: данные, которые вернул сервер
    sendData,     // функция, которую вызываем для отправки данных
  };
}

export default useServerData;
