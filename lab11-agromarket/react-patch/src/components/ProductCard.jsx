function ProductCard({ product, onAdd, featured }) {
  return (
    <article className={featured ? 'card card--featured' : 'card'} data-testid="product-card">
      {featured && <span className="badge">Товар недели</span>}

      {product.image ? (
        <img src={product.image} alt={product.name} />
      ) : (
        <div
          className="card-emoji"
          style={{ background: product.color || '#eef3ea' }}
          role="img"
          aria-label={product.name}
        >
          {product.emoji || '🛒'}
        </div>
      )}

      <h3>{product.name}</h3>
      <p className="price">{product.price} тг</p>
      <button onClick={() => onAdd(product)}>В корзину</button>
    </article>
  );
}

export default ProductCard;
