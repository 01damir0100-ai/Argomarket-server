import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import App from './App';
import { mockFetch, mockRoutes } from './test/helpers';

const products = [
  { id: 1, name: 'Молоко фермерское 1 л', price: 650, emoji: '🥛' },
  { id: 2, name: 'Мёд цветочный 500 г', price: 3500, emoji: '🍯' },
];

describe('Каталог: три состояния экрана', () => {
  test('сначала показывает загрузку, потом товары', async () => {
    mockFetch(products);
    render(<App />);

    expect(screen.getByText(/загрузка товаров/i)).toBeInTheDocument();
    // findBy ждёт, пока «придёт ответ сервера» и React перерисует экран
    expect(await screen.findByText('Молоко фермерское 1 л')).toBeInTheDocument();
    expect(screen.getByText('Мёд цветочный 500 г')).toBeInTheDocument();
    expect(screen.queryByText(/загрузка товаров/i)).not.toBeInTheDocument();
  });

  test('запрашивает каталог по правильному адресу', async () => {
    const spy = mockFetch(products);
    render(<App />);
    await screen.findByText('Молоко фермерское 1 л');

    expect(spy).toHaveBeenCalledTimes(1); // гость: /auth/me не запрашивается
    expect(String(spy.mock.calls[0][0])).toMatch(/\/api\/products$/);
  });

  test('сервер вернул пустой список — «Товаров пока нет»', async () => {
    mockFetch([]);
    render(<App />);

    expect(await screen.findByText('Товаров пока нет')).toBeInTheDocument();
  });

  test('ошибка сервера (500) — сообщение об ошибке', async () => {
    mockFetch({ error: 'Внутренняя ошибка сервера' }, 500);
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/не удалось загрузить товары/i);
  });

  test('сеть недоступна — сообщение об ошибке', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/не удалось загрузить товары/i);
  });
});

describe('Каталог: действия пользователя', () => {
  test('поиск оставляет только подходящие товары', async () => {
    const user = userEvent.setup();
    mockFetch(products);
    render(<App />);
    await screen.findByText('Молоко фермерское 1 л');

    await user.type(screen.getByRole('searchbox'), 'мёд');

    expect(screen.getByText('Мёд цветочный 500 г')).toBeInTheDocument();
    expect(screen.queryByText('Молоко фермерское 1 л')).not.toBeInTheDocument();
  });

  test('«В корзину» увеличивает счётчик в шапке', async () => {
    const user = userEvent.setup();
    mockFetch(products);
    render(<App />);
    await screen.findByText('Молоко фермерское 1 л');
    expect(screen.getByText(/Корзина: 0/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /в корзину/i })[0]);

    expect(screen.getByText(/Корзина: 1/)).toBeInTheDocument();
  });
});

describe('Вход и роли', () => {
  test('гость видит форму входа и не видит форму добавления товара', async () => {
    mockFetch(products);
    render(<App />);
    await screen.findByText('Молоко фермерское 1 л');

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Новый товар' })).not.toBeInTheDocument();
  });

  test('администратор видит форму добавления товара', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Админ', role: 'admin' }));
    mockRoutes({
      '/products': products,
      '/auth/me': { id: 1, name: 'Админ', email: 'admin@test.kz', role: 'admin' },
    });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Новый товар' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Вход' })).not.toBeInTheDocument();
  });

  test('покупатель вошёл, но формы добавления товара не видит', async () => {
    localStorage.setItem('token', 'user-token');
    localStorage.setItem('user', JSON.stringify({ id: 2, name: 'Айгерим', role: 'user' }));
    mockRoutes({
      '/products': products,
      '/auth/me': { id: 2, name: 'Айгерим', email: 'a@mail.kz', role: 'user' },
    });
    render(<App />);

    expect(await screen.findByText(/Вы вошли как/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Новый товар' })).not.toBeInTheDocument();
  });

  test('«Выйти» удаляет токен и снова показывает форму входа', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'user-token');
    localStorage.setItem('user', JSON.stringify({ id: 2, name: 'Айгерим', role: 'user' }));
    mockRoutes({
      '/products': products,
      '/auth/me': { id: 2, name: 'Айгерим', email: 'a@mail.kz', role: 'user' },
    });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Выйти' }));

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
