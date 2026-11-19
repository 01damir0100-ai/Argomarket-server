// Адрес API — из переменной окружения Vite.
// Локально берётся из .env.development, на хостинге (ЛР9) — из настроек сборки
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Обёртка над fetch: добавляет токен, разбирает JSON и превращает ошибки API в исключения
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    // сеть недоступна или сервер «спит» и не отвечает
    throw new Error('Нет связи с сервером. Попробуйте позже');
  }

  // 204 — тела нет; при ответе не в JSON (например, HTML от прокси) — тоже не падаем
  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  // Токен был, но сервер его не принял (истёк / подделан) — выходим из аккаунта
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  }

  if (!res.ok) {
    const error = new Error(data?.error || `Ошибка ${res.status}`);
    error.status = res.status;
    error.details = data?.details; // список ошибок валидации [{ field, message }]
    throw error;
  }
  return data;
}

// Что показать пользователю: ошибки валидации по полям или общий текст ошибки
export function errorMessages(err) {
  if (Array.isArray(err.details) && err.details.length > 0) {
    return err.details.map((d) => d.message);
  }
  return [err.message];
}
