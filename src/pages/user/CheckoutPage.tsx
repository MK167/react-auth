/**
 * @fileoverview User Checkout Page (mock UI).
 *
 * Renders a realistic checkout form with shipping address and payment fields.
 * The checkout flow is intentionally mocked — no real payment processing is
 * performed. On form submission, the cart is cleared and the user is shown a
 * success confirmation with a generated order number.
 *
 * A real implementation would integrate with a payment provider (Stripe, etc.)
 * and call the FreeAPI orders endpoint to persist the order server-side.
 *
 * @module pages/user/CheckoutPage
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Check, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';

type CheckoutStep = 'form' | 'success';

/**
 * Mock checkout page with shipping + payment form and order confirmation.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const [step, setStep] = useState<CheckoutStep>('form');
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber] = useState(
    () => `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  );

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  // Empty cart guard
  if (items.length === 0 && step !== 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <ShoppingBag size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300 mb-4">Your cart is empty.</p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Browse products
        </button>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-5">
          <Check size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Order placed!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-1">Thank you for your purchase.</p>
        <p className="text-sm font-mono text-indigo-600 dark:text-indigo-400 mb-8">
          Order #{orderNumber}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            View orders
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate processing delay
    setTimeout(() => {
      clearCart();
      setStep('success');
      setSubmitting(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-3 space-y-5"
        >
          {/* Shipping */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Shipping address
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  First name
                </label>
                <input
                  id="firstName"
                  required
                  placeholder="John"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Last name
                </label>
                <input
                  id="lastName"
                  required
                  placeholder="Doe"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="address" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Street address
                </label>
                <input
                  id="address"
                  required
                  placeholder="123 Main St"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  City
                </label>
                <input
                  id="city"
                  required
                  placeholder="New York"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  ZIP / Postal
                </label>
                <input
                  id="zip"
                  required
                  placeholder="10001"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Payment
              </h2>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Lock size={12} />
                Secure
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="cardNumber" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Card number
                </label>
                <div className="relative">
                  <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="cardNumber"
                    required
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expiry" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    id="expiry"
                    required
                    placeholder="12/27"
                    maxLength={5}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="cvv" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    CVV
                  </label>
                  <input
                    id="cvv"
                    required
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? 'Processing payment…' : `Pay $${(totalPrice * 1.1).toFixed(2)}`}
          </button>
        </form>

        {/* Order summary */}
        <aside className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 sticky top-20">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Order ({totalItems})
            </h2>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map(({ product, quantity }) => (
                <div key={product._id} className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                    {product.mainImage?.url && (
                      <img
                        src={product.mainImage.url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400">×{quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    ${(product.price * quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Tax (10%)</span>
                <span>${(totalPrice * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-700 pt-2">
                <span>Total</span>
                <span>${(totalPrice * 1.1).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
