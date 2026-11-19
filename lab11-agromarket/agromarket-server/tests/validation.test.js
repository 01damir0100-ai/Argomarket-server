import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { uniqueEmail, getAdminToken } from './helpers.js';

describe('Валидация входных данных', () => {
  let adminToken;
  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  const authed = (req) => req.set('Authorization', `Bearer ${adminToken}`);

  it('регистрация с некорректным e-mail → 400 и поле email в details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Тест', email: 'не-почта', password: '12345678' });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain('email');
  });

  it('нельзя зарегистрироваться админом через поле role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Хакер', email: uniqueEmail(), password: '12345678', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user'); // лишнее поле role отброшено
  });

  it('пароль из 7 символов → 400 и поле password в details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Тест', email: uniqueEmail(), password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain('password');
  });

  it('вход без пароля → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.kz' });

    expect(res.status).toBe(400);
  });

  it('товар с отрицательной ценой → 400', async () => {
    const res = await authed(request(app).post('/api/products'))
      .send({ name: 'Мёд', price: -500, category: 'Мёд' });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain('price');
  });

  it('цена строкой "3500" приводится к числу (coerce)', async () => {
    const created = await authed(request(app).post('/api/products'))
      .send({ name: 'Мёд липовый', price: '3500', category: 'Мёд' });

    expect(created.status).toBe(201);
    expect(created.body.price).toBe(3500);

    await authed(request(app).delete(`/api/products/${created.body.id}`)); // уборка
  });

  it('PATCH с пустым телом {} → 400', async () => {
    const res = await authed(request(app).patch('/api/products/1')).send({});
    expect(res.status).toBe(400);
  });

  it('PATCH меняет только переданные поля', async () => {
    const created = await authed(request(app).post('/api/products'))
      .send({ name: 'Патч-товар', price: 100, category: 'Тест' });

    const res = await authed(request(app).patch(`/api/products/${created.body.id}`))
      .send({ price: 150 });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(150);
    expect(res.body.name).toBe('Патч-товар'); // остальное не тронуто

    await authed(request(app).delete(`/api/products/${created.body.id}`)); // уборка
  });

  it('GET /api/products/abc → 400, а не 500', async () => {
    const res = await request(app).get('/api/products/abc');
    expect(res.status).toBe(400);
  });

  it('GET /api/products/-1 → 400', async () => {
    const res = await request(app).get('/api/products/-1');
    expect(res.status).toBe(400);
  });

  it('тело больше лимита → 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.kz', password: 'x'.repeat(200_000) });

    expect(res.status).toBe(413);
  });
});
