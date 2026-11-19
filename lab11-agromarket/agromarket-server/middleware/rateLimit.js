import rateLimit from 'express-rate-limit';

// Защита входа и регистрации от подбора пароля (brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // окно 15 минут
  limit: 10, // не больше 10 попыток с одного IP
  standardHeaders: 'draft-7', // заголовки RateLimit и RateLimit-Policy
  legacyHeaders: false,
  message: { error: 'Слишком много попыток. Попробуйте через 15 минут' },
  // Тесты ЛР8 не должны упираться в лимит. Условие проверяется при каждом запросе,
  // поэтому отдельный тест может временно «выключить» режим test
  skip: () => process.env.NODE_ENV === 'test',
});
