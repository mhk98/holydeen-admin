import { useEffect, useState } from 'react';
import { productService } from '../../services/productService';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 bg-white';

export default function CategoryAddonFields({ productId, price, onProductChange, onPriceChange }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productService.getAll({ limit: 500 }).then((res) => setProducts(res?.data || [])).catch(() => setProducts([]));
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Add-on Product (Optional)</label>
        <select value={productId} onChange={(e) => onProductChange(e.target.value)} className={inputCls}>
          <option value="">No add-on</option>
          {products.map((product) => (
            <option key={product.Id} value={product.Id}>{product.name}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Shown at checkout for each product bought from this category. It is hidden from the shop.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Add-on Price</label>
        <input type="number" min="0" value={price} onChange={(e) => onPriceChange(e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}
