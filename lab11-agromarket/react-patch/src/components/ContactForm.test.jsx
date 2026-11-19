import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import ContactForm from './ContactForm';
import { mockFetch } from '../test/helpers';

const products = [
  { id: 1, name: 'Молоко фермерское 1 л' },
  { id: 2, name: 'Мёд цветочный 500 г' },
];

// Заполняет обязательные поля формы заявки
async function fillOrder(user) {
  await user.selectOptions(screen.getByLabelText('Товар'), '2');
  await user.type(screen.getByLabelText(/имя/i), 'КХ Береке');
  await user.type(screen.getByLabelText('Email'), 'bereke@mail.kz');
  await user.type(screen.getByLabelText(/объём заказа/i), '20');
}

describe('ContactForm', () => {
  test('показывает товары каталога в списке выбора', () => {
    render(<ContactForm products={products} />);

    expect(screen.getByRole('option', { name: 'Молоко фермерское 1 л' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Мёд цветочный 500 г' })).toBeInTheDocument();
  });

  test('отправляет заявку на /orders и сообщает её номер', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const spy = mockFetch({ id: 7, status: 'new' }, 201);
    render(<ContactForm products={products} />);

    await fillOrder(user);
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Заявка №7')));

    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/orders$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toMatchObject({
      product_id: '2',
      name: 'КХ Береке',
      email: 'bereke@mail.kz',
      quantity: 20,
    });
    // после успеха форма очищается
    expect(screen.getByLabelText(/имя/i)).toHaveValue('');
  });

  test('ошибка сервера показывается под формой', async () => {
    const user = userEvent.setup();
    mockFetch({ error: 'Минимальный объём заказа — 10 кг' }, 400);
    render(<ContactForm products={products} />);

    await fillOrder(user);
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(await screen.findByText('Минимальный объём заказа — 10 кг')).toBeInTheDocument();
  });

  test('сеть недоступна — понятное сообщение, а не «Failed to fetch»', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<ContactForm products={products} />);

    await fillOrder(user);
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(await screen.findByText(/нет связи с сервером/i)).toBeInTheDocument();
  });

  test('вошедший пользователь: в запрос добавляется заголовок Authorization', async () => {
    localStorage.setItem('token', 'test-token');
    const user = userEvent.setup();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const spy = mockFetch({ id: 8 }, 201);
    render(<ContactForm products={products} />);

    await fillOrder(user);
    await user.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, options] = spy.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });
});
