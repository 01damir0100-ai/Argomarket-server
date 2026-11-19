// validate(schema) — проверяет req.body схемой zod.
// При ошибке отвечает 400 со списком проблем, при успехе кладёт в req.body
// ОЧИЩЕННЫЕ данные (лишние поля, например role, отброшены).
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;
  next();
};

// Проверяет параметр :id в адресе. GET /api/products/abc → 400, а не 500 из базы
export const idParam = (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный id' });
  }

  req.params.id = id;
  next();
};
