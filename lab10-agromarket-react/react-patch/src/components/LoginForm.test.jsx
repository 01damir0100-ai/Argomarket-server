import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import LoginForm from './LoginForm';
import { mockFetch } from '../test/helpers';

const reply = { user: { id: 1, name: 'Айгерим', role: 'user' }, token: 'jwt-token' };

describe('LoginForm', () => {
  test('по умолчанию — форма входа без поля «Имя»', () => {
    render(<LoginForm onLogin={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.queryByLabelText('Имя')).not.toBeInTheDocument();
  });

  test('переключение на регистрацию показывает поле «Имя»', async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /нет аккаунта/i }));

    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument();
    expect(screen.getByLabelText('Имя')).toBeInTheDocument();
  });

  test('вход: отправляет e-mail и пароль и передаёт пользователя и токен в onLogin', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const spy = mockFetch(reply);
    render(<LoginForm onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Email'), 'aigerim@mail.kz');
    await user.type(screen.getByLabelText('Пароль'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
    expect(onLogin).toHaveBeenCalledWith(reply.user, 'jwt-token');

    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/login$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ email: 'aigerim@mail.kz', password: 'secret123' });
  });

  test('регистрация: отправляет имя, e-mail и пароль на /auth/register', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const spy = mockFetch(reply, 201);
    render(<LoginForm onLogin={onLogin} />);

    await user.click(screen.getByRole('button', { name: /нет аккаунта/i }));
    await user.type(screen.getByLabelText('Имя'), 'Айгерим');
    await user.type(screen.getByLabelText('Email'), 'aigerim@mail.kz');
    await user.type(screen.getByLabelText('Пароль'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
    const [url, options] = spy.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/register$/);
    expect(JSON.parse(options.body)).toEqual({
      name: 'Айгерим', email: 'aigerim@mail.kz', password: 'secret123',
    });
  });

  test('неверный пароль: показывает ошибку сервера и не вызывает onLogin', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    mockFetch({ error: 'Неверный email или пароль' }, 401);
    render(<LoginForm onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Email'), 'aigerim@mail.kz');
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Неверный email или пароль')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  test('с пустыми полями запрос не отправляется', async () => {
    const user = userEvent.setup();
    const spy = mockFetch(reply);
    render(<LoginForm onLogin={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(spy).not.toHaveBeenCalled();
  });

  test('e-mail без @ — форма не отправляется', async () => {
    const user = userEvent.setup();
    const spy = mockFetch(reply);
    render(<LoginForm onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'не-почта');
    await user.type(screen.getByLabelText('Пароль'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(spy).not.toHaveBeenCalled();
  });
});
