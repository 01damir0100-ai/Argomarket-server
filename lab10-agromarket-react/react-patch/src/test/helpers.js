import { vi } from 'vitest';

// Ответ «сервера»: Response — стандартный класс, как в настоящем fetch
export function jsonResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Подменяет fetch: на каждый запрос отдаёт СВЕЖИЙ Response
// (тело ответа читается только один раз)
export function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse(body, status));
}

// Разные ответы на разные адреса: routes = { '/products': [...], '/auth/me': {...} }
export function mockRoutes(routes) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const path = String(url).replace(/^.*\/api/, '');
    if (path in routes) return jsonResponse(routes[path]);
    return jsonResponse({ error: 'Не найдено' }, 404);
  });
}
