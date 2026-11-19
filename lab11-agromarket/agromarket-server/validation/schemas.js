import { z } from 'zod';

// Строка с одним и тем же текстом ошибки для «нет поля» и «не строка»
const text = (message) => z.string({ required_error: message, invalid_type_error: message });

// Необязательная строка: пустая '' считается «не передано»
const optionalText = (max, message) =>
  z.string({ invalid_type_error: message })
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || undefined);

export const registerSchema = z.object({
  name: text('Укажите имя').trim()
    .min(2, 'Имя — минимум 2 символа')
    .max(100, 'Имя — не длиннее 100 символов'),
  email: text('Укажите e-mail').trim().toLowerCase().email('Некорректный e-mail'),
  // 72 — предел bcrypt (учитывает только первые 72 байта); без верхней границы
  // пароль в 1 МБ заставил бы сервер долго считать хэш
  password: text('Укажите пароль')
    .min(8, 'Пароль — минимум 8 символов')
    .max(72, 'Пароль — не длиннее 72 символов'),
});

export const loginSchema = z.object({
  email: text('Укажите e-mail').trim().toLowerCase().email('Некорректный e-mail'),
  password: text('Укажите пароль').min(1, 'Введите пароль').max(72, 'Пароль — не длиннее 72 символов'),
});

export const productSchema = z.object({
  name: text('Укажите название товара').trim()
    .min(2, 'Название — минимум 2 символа')
    .max(200, 'Название — не длиннее 200 символов'),
  // coerce: из формы цена приходит строкой "3500" — приводим к числу
  price: z.coerce
    .number({ invalid_type_error: 'Цена должна быть числом' })
    .int('Цена — целое число')
    .positive('Цена должна быть больше 0')
    .max(10_000_000, 'Слишком большая цена'),
  category: optionalText(50, 'Категория — не длиннее 50 символов'),
  unit: z.string({ invalid_type_error: 'Единица измерения — текст' })
    .trim()
    .min(1, 'Единица измерения не может быть пустой')
    .max(20, 'Единица измерения — не длиннее 20 символов')
    .optional(),
  image: optionalText(500, 'Ссылка на картинку — не длиннее 500 символов'),
  emoji: optionalText(16, 'Эмодзи — не длиннее 16 символов'),
  color: optionalText(20, 'Цвет — не длиннее 20 символов'),
});

// Для PATCH: все поля необязательны, но хотя бы одно должно быть
export const productUpdateSchema = productSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Нет полей для обновления');
