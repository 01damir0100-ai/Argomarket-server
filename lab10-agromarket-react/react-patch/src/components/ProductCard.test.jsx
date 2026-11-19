import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import ProductCard from './ProductCard';

const product = {
  id: 1,
  name: 'Мёд цветочный 500 г',
  price: 3500,
  emoji: '🍯',
  color: '#fff3cd',
};

describe('ProductCard', () => {
  test('показывает название и цену', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Мёд цветочный 500 г' })).toBeInTheDocument();
    expect(screen.getByText(/3\s?500 тг/)).toBeInTheDocument();
  });

  test('кнопка «В корзину» вызывает onAdd с товаром', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(); // «шпион»: запоминает, как его вызвали
    render(<ProductCard product={product} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /в корзину/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(product);
  });

  test('без картинки показывает эмодзи с подписью для экранного диктора', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} />);

    const emoji = screen.getByRole('img', { name: 'Мёд цветочный 500 г' });
    expect(emoji).toHaveTextContent('🍯');
  });

  test('с картинкой показывает <img> с alt', () => {
    const withImage = { ...product, image: 'https://example.com/honey.jpg' };
    render(<ProductCard product={withImage} onAdd={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Мёд цветочный 500 г' }))
      .toHaveAttribute('src', 'https://example.com/honey.jpg');
  });

  test('значок «Товар недели» только у featured-карточки', () => {
    const { rerender } = render(<ProductCard product={product} onAdd={vi.fn()} />);
    expect(screen.queryByText('Товар недели')).not.toBeInTheDocument();

    rerender(<ProductCard product={product} onAdd={vi.fn()} featured />);
    expect(screen.getByText('Товар недели')).toBeInTheDocument();
  });
});
