import { describe, test, expect, vi } from 'vitest';
import { apiFetch, errorMessages } from './api';
import { mockFetch } from './test/helpers';

describe('apiFetch', () => {
  test('без токена заголовка Authorization нет', async () => {
    const spy = mockFetch([]);
    await apiFetch('/products');

    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/products$/);
    expect(options.headers).not.toHaveProperty('Authorization');
  });

  test('с токеном добавляет Authorization: Bearer', async () => {
    localStorage.setItem('token', 'test-token');
    const spy = mockFetch([]);
    await apiFetch('/orders');

    expect(spy.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });

  test('ответ не 2xx — бросает ошибку с текстом сервера', async () => {
    mockFetch({ error: 'Товар не найден' }, 404);
    await expect(apiFetch('/products/999')).rejects.toThrow('Товар не найден');
  });

  test('ответ 204 без тела возвращает null', async () => {
    mockFetch(null, 204);
    await expect(apiFetch('/products/1', { method: 'DELETE' })).resolves.toBeNull();
  });

  test('сеть недоступна — понятная ошибка', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiFetch('/products')).rejects.toThrow(/нет связи с сервером/i);
  });

  test('401 при сохранённом токене: токен удаляется и страница перезагружается', async () => {
    localStorage.setItem('token', 'expired');
    localStorage.setItem('user', '{"name":"Тест"}');
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    mockFetch({ error: 'Срок действия токена истёк, войдите снова' }, 401);

    await expect(apiFetch('/auth/me')).rejects.toThrow(/истёк/);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
  });

  test('ошибка валидации: в исключении есть status и details', async () => {
    const details = [{ field: 'price', message: 'Цена должна быть больше 0' }];
    mockFetch({ error: 'Ошибка валидации', details }, 400);

    const err = await apiFetch('/products', { method: 'POST' }).catch((e) => e);

    expect(err.status).toBe(400);
    expect(err.details).toEqual(details);
    expect(errorMessages(err)).toEqual(['Цена должна быть больше 0']);
  });

  test('errorMessages без details возвращает общий текст ошибки', () => {
    expect(errorMessages(new Error('Нет связи с сервером'))).toEqual(['Нет связи с сервером']);
  });
});
