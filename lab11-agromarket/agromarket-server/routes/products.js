import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, idParam } from '../middleware/validate.js';
import { productSchema, productUpdateSchema } from '../validation/schemas.js';

const router = Router();

const adminOnly = [requireAuth, requireRole('admin')]; // цепочка из двух middleware

// Поля, которые можно менять через PATCH (имена колонок — не из запроса, а отсюда)
const PATCHABLE = ['name', 'category', 'price', 'unit', 'image', 'emoji', 'color'];

// GET /api/products?search=мол
router.get('/', async (req, res) => {
  const search = req.query.search || '';
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE name ILIKE $1 ORDER BY id',
    [`%${search}%`]
  );
  res.json(rows);
});

// GET /api/products/2
router.get('/:id', idParam, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// POST /api/products — новый товар (порядок: кто ты → есть ли права → корректны ли данные)
router.post('/', ...adminOnly, validate(productSchema), async (req, res) => {
  const { name, category, price, unit, image, emoji, color } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO products (name, category, price, unit, image, emoji, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, category ?? null, price, unit ?? 'кг', image ?? null, emoji ?? null, color ?? null]
  );
  res.status(201).json(rows[0]); // вернули созданный товар вместе с новым id
});

// PUT /api/products/5 — заменить товар целиком
router.put('/:id', idParam, ...adminOnly, validate(productSchema), async (req, res) => {
  const { name, category, price, unit, image, emoji, color } = req.body;
  const { rows } = await pool.query(
    `UPDATE products
     SET name = $1, category = $2, price = $3, unit = $4, image = $5, emoji = $6, color = $7
     WHERE id = $8
     RETURNING *`,
    [name, category ?? null, price, unit ?? 'кг', image ?? null, emoji ?? null, color ?? null, req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// PATCH /api/products/5 — изменить только переданные поля, например { "price": 3700 }
router.patch('/:id', idParam, ...adminOnly, validate(productUpdateSchema), async (req, res) => {
  // После validate в req.body только поля из схемы; ещё раз отбираем по белому списку
  const fields = PATCHABLE.filter((key) => key in req.body);
  const setClause = fields.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = fields.map((key) => req.body[key] ?? null);

  const { rows } = await pool.query(
    `UPDATE products SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
    [...values, req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// DELETE /api/products/5
router.delete('/:id', idParam, ...adminOnly, async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM products WHERE id = $1',
    [req.params.id]
  );
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.status(204).end(); // 204 — успешно, тела у ответа нет
});

export default router;
