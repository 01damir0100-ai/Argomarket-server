import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Rate limit на вход', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('первые 10 неверных входов → 401, 11-й → 429', async () => {
    // В режиме test лимитер выключен; на время этого теста включаем его
    vi.stubEnv('NODE_ENV', 'development');
    const attempt = () => request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.kz', password: 'wrong-password' });

    for (let i = 1; i <= 10; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/слишком много попыток/i);
  });
});
