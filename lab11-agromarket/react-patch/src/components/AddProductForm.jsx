import { useState } from 'react';
import { apiFetch, errorMessages } from '../api.js';

export default function AddProductForm({ onAdded }) {
  const [errors, setErrors] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      // токен добавит apiFetch; price из формы — строка, на сервер отправляем числом
      const product = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({ ...data, price: Number(data.price) }),
      });
      onAdded(product); // сообщаем App о новом товаре
      form.reset();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h3>Новый товар</h3>
      <input name="name" placeholder="Название" aria-label="Название" required />
      <input name="category" placeholder="Категория" aria-label="Категория" />
      <input name="price" type="number" min="0" placeholder="Цена, ₸" aria-label="Цена" required />
      <input name="unit" placeholder="Единица (кг, л)" aria-label="Единица" defaultValue="кг" />

      {errors.length > 0 && (
        <ul className="form-errors">
          {errors.map((m, i) => <li key={`${i}-${m}`}>{m}</li>)}
        </ul>
      )}
      <button type="submit">Добавить</button>
    </form>
  );
}
