import { test, expect } from '@playwright/test';

const email = `e2e+${Date.now()}@agromarket.test`; // каждый запуск — новый покупатель
const password = 'E2e-Test-Password-123';

test('каталог загружается с сервера', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/АгроМаркет/i);
  await expect(page.getByTestId('product-card').first()).toBeVisible();
});

test('прямая ссылка на внутренний путь не даёт 404', async ({ page }) => {
  const response = await page.goto('/login'); // проверка rewrites в vercel.json из ЛР9
  expect(response.status()).toBe(200);
});

test('гость не видит форму добавления товара', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-card').first()).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Новый товар' })).toHaveCount(0);
});

test('покупатель регистрируется, оформляет заявку и выходит', async ({ page }) => {
  await page.goto('/');
  const auth = page.locator('.auth-bar');
  const order = page.locator('#contact');

  // 1. Регистрация (после неё пользователь сразу считается вошедшим)
  await auth.getByRole('button', { name: /нет аккаунта/i }).click();
  await auth.getByLabel('Имя').fill('E2E Покупатель');
  await auth.getByLabel('Email').fill(email);
  await auth.getByLabel('Пароль').fill(password);
  await auth.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(auth.getByText(/Вы вошли как/)).toContainText('E2E Покупатель');
  // покупателю форма добавления товара недоступна
  await expect(page.getByRole('heading', { name: 'Новый товар' })).toHaveCount(0);

  // 2. Заявка: выбираем первый товар каталога
  await order.getByLabel('Товар').selectOption({ index: 1 });
  await order.getByLabel(/имя/i).fill('E2E Покупатель');
  await order.getByLabel('Email').fill(email);
  await order.getByLabel(/объём заказа/i).fill('20');

  const dialogPromise = page.waitForEvent('dialog'); // заявка подтверждается через alert
  await order.getByRole('button', { name: /отправить заявку/i }).click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toMatch(/Заявка №\d+ отправлена/);
  await dialog.accept();

  // 3. Выход
  await auth.getByRole('button', { name: 'Выйти' }).click();
  await expect(auth.getByRole('heading', { name: 'Вход' })).toBeVisible();
});
