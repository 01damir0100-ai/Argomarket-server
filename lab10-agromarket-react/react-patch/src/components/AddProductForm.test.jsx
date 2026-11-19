import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import AddProductForm from './AddProductForm';
import { mockFetch } from '../test/helpers';

describe('AddProductForm', () => {
  test('отправляет товар с токеном админа, цена уходит числом', async () => {
    localStorage.setItem('token', 'admin-token');
    const user = userEvent.setup();
    const onAdded = vi.fn();
    const created = { id: 9, name: 'Мёд гречишный', price: 3800 };
    const spy = mockFetch(created, 201);
    render(<AddProductForm onAdded={onAdded} />);

    await user.type(screen.getByLabelText('Название'), 'Мёд гречишный');
    await user.type(screen.getByLabelText('Цена'), '3800');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(created));

    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/products$/);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer admin-token');
    expect(JSON.parse(options.body)).toMatchObject({ name: 'Мёд гречишный', price: 3800 });
    // форма очищена
    expect(screen.getByLabelText('Название')).toHaveValue('');
  });

  test('сервер отказал (403) — показывает ошибку и не зовёт onAdded', async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    mockFetch({ error: 'Недостаточно прав' }, 403);
    render(<AddProductForm onAdded={onAdded} />);

    await user.type(screen.getByLabelText('Название'), 'Мёд');
    await user.type(screen.getByLabelText('Цена'), '100');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(await screen.findByText('Недостаточно прав')).toBeInTheDocument();
    expect(onAdded).not.toHaveBeenCalled();
  });

  test('без названия запрос не отправляется', async () => {
    const user = userEvent.setup();
    const spy = mockFetch({});
    render(<AddProductForm onAdded={vi.fn()} />);

    await user.type(screen.getByLabelText('Цена'), '100');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(spy).not.toHaveBeenCalled();
  });
});
