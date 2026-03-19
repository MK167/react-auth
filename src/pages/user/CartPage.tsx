/**
 * @fileoverview User Cart Page.
 *
 * Displays all items currently in the Zustand cart store. Users can:
 * - Adjust quantity for each line item (± buttons, capped at product.stock)
 * - Remove individual items
 * - Clear the entire cart
 * - Navigate to checkout
 *
 * The cart total is computed via `useCartStore().getTotalPrice()` which
 * recalculates on every render (not stored as derived state, per the single
 * source of truth principle described in `cart.store.ts`).
 *
 * ## Prefetch strategy
 *
 * `prefetchCheckout()` is called on mount so that the CheckoutPage JS chunk
 * starts downloading while the user reviews their cart. By the time they click
 * "Proceed to checkout" the chunk is already cached, making the transition
 * feel instant.
 *
 * ## Product navigation
 *
 * Product images and names link to `/products/:slugId` (SEO slug format) via
 * `toProductSlugId(name, id)`. This keeps cart links consistent with the rest
 * of the storefront (HomePage cards, ProductsPage cards, etc.).
 *
 * @module pages/user/CartPage
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { toProductSlugId } from '@/utils/slug';
import { prefetchCheckout } from '@/utils/prefetch';

/**
 * Shopping cart page — line items, quantity controls, totals, and checkout CTA.
 */
export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice, getTotalItems } =
    useCartStore();

  // Prefetch the CheckoutPage JS chunk while the user reviews their cart.
  // By the time they click "Proceed to checkout" the chunk is already cached.
  useEffect(() => { prefetchCheckout(); }, []);

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <ShoppingBag size={56} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Your cart is empty
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Add some products to your cart to get started.
        </p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors"
        >
          Browse products
          <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Heading */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cart <span className="text-gray-400 font-normal text-lg">({totalItems})</span>
        </h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700 hover:underline transition-colors"
        >
          Clear cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(({ product, quantity }) => (
            <div
              key={product._id}
              className="flex gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4"
            >
              {/* Image */}
              <div
                className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/products/${toProductSlugId(product.name, product._id)}`)}
              >
                {product.mainImage?.url ? (
                  <img
                    src={product.mainImage.url}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                    No img
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h3
                  className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => navigate(`/products/${toProductSlugId(product.name, product._id)}`)}
                >
                  {product.name}
                </h3>
                {product.category?.name && (
                  <p className="text-xs text-gray-400 mb-2">{product.category.name}</p>
                )}
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  ${(product.price * quantity).toFixed(2)}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end justify-between">
                <button
                  type="button"
                  onClick={() => removeItem(product._id)}
                  aria-label={`Remove ${product.name} from cart`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={14} />
                </button>

                {/* Quantity */}
                <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product._id, quantity - 1)}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="px-2 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="px-3 py-1 text-sm font-semibold text-gray-900 dark:text-white border-x border-gray-200 dark:border-gray-600 min-w-[32px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product._id, quantity + 1)}
                    disabled={quantity >= product.stock}
                    aria-label="Increase quantity"
                    className="px-2 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 sticky top-20">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Order summary</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Subtotal ({totalItems} items)</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Shipping</span>
                <span className="text-green-600 dark:text-green-400">Free</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Tax (est.)</span>
                <span>${(totalPrice * 0.1).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mb-5">
              <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                <span>Total</span>
                <span>${(totalPrice * 1.1).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Proceed to checkout
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/products')}
              className="w-full mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
