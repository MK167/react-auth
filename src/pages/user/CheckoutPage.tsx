/**
 * @fileoverview Checkout page — RHF + Zod validated form with payment simulation.
 *
 * ## Validation
 * All fields use `react-hook-form` with `zodResolver(checkoutSchema)`.
 * Errors appear inline under each field on blur or submit attempt.
 *
 * ## Payment simulation (test mode)
 * | Card number starts with | Result           |
 * |-------------------------|------------------|
 * | `0000`                  | Payment declined |
 * | anything else (valid)   | Payment approved |
 *
 * On success the order is POSTed to `/api/v1/ecommerce/orders`, the cart is
 * cleared, and the user sees the confirmation screen.
 *
 * @module pages/user/CheckoutPage
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Check, ShoppingBag, AlertCircle, Info } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { authUrl } from '@/config/Define';
import { checkoutSchema, isDeclinedCard } from '@/schemas/checkout.schema';
import type { CheckoutFormValues } from '@/schemas/checkout.schema';
import { useI18n } from '@/i18n/use-i18n.hook';
import { usePageMeta } from '@/hooks/usePageMeta';

// ---------------------------------------------------------------------------
// Field error helper
// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <AlertCircle size={11} />
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Input helper
// ---------------------------------------------------------------------------

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
      : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
  }`;
}

type CheckoutStep = 'form' | 'success';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckoutPage() {
  usePageMeta('Checkout', 'Complete your purchase securely at ShopHub.');
  const navigate = useNavigate();
  const { translate } = useI18n();
  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);

  const [step, setStep]                   = useState<CheckoutStep>('form');
  const [paymentError, setPaymentError]   = useState<string | null>(null);
  const [orderNumber]                     = useState(
    () => `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  );

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
  });

  // Empty cart guard
  if (items.length === 0 && step !== 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <ShoppingBag size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300 mb-4">{translate('checkout.emptyCart')}</p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {translate('checkout.browseProducts')}
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{translate('checkout.orderPlaced')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-1">{translate('checkout.thankYou')}</p>
        <p className="text-sm font-mono text-indigo-600 dark:text-indigo-400 mb-8">
          Order #{orderNumber}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {translate('checkout.viewOrders')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {translate('checkout.continueShopping')}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------

  const onSubmit = async (values: CheckoutFormValues) => {
    setPaymentError(null);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1500));

    // Payment simulation
    if (isDeclinedCard(values.cardNumber)) {
      setPaymentError('Payment declined. Your card was not charged. Please check your card details or use a different card.');
      return;
    }

    // Post order to mock server
    try {
      await authUrl.post('/ecommerce/orders', {
        items: items.map(({ product, quantity }) => ({
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            mainImage: product.mainImage,
          },
          quantity,
        })),
        shippingAddress: {
          street: values.address,
          city: values.city,
          zip: values.zip,
          name: `${values.firstName} ${values.lastName}`,
        },
        totalAmount: totalPrice * 1.1,
        orderNumber,
      });
    } catch {
      // Non-fatal — in mock mode the order save may fail if server is off.
      // Still show success to the user so checkout UX works offline.
    }

    clearCart();
    setStep('success');
  };

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{translate('checkout.title')}</h1>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="lg:col-span-3 space-y-5">

          {/* Shipping */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{translate('checkout.shippingAddress')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {translate('checkout.firstName')}
                </label>
                <input
                  id="firstName"
                  placeholder="John"
                  className={inputCls(!!errors.firstName)}
                  {...register('firstName')}
                />
                <FieldError message={errors.firstName?.message} />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {translate('checkout.lastName')}
                </label>
                <input
                  id="lastName"
                  placeholder="Doe"
                  className={inputCls(!!errors.lastName)}
                  {...register('lastName')}
                />
                <FieldError message={errors.lastName?.message} />
              </div>

              <div className="col-span-2">
                <label htmlFor="address" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {translate('checkout.streetAddress')}
                </label>
                <input
                  id="address"
                  placeholder="123 Main St"
                  className={inputCls(!!errors.address)}
                  {...register('address')}
                />
                <FieldError message={errors.address?.message} />
              </div>

              <div>
                <label htmlFor="city" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {translate('checkout.city')}
                </label>
                <input
                  id="city"
                  placeholder="New York"
                  className={inputCls(!!errors.city)}
                  {...register('city')}
                />
                <FieldError message={errors.city?.message} />
              </div>

              <div>
                <label htmlFor="zip" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {translate('checkout.zip')}
                </label>
                <input
                  id="zip"
                  placeholder="10001"
                  className={inputCls(!!errors.zip)}
                  {...register('zip')}
                />
                <FieldError message={errors.zip?.message} />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">{translate('checkout.payment')}</h2>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Lock size={12} />
                {translate('checkout.secure')}
              </div>
            </div>

            {/* Test mode hint */}
            <div className="flex items-start gap-2 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Test mode — </span>
                any card → success &nbsp;|&nbsp;
                <span className="font-mono">0000 0000 0000 0000</span> → declined
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="cardNumber" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {translate('checkout.cardNumber')}
                </label>
                <div className="relative">
                  <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className={`${inputCls(!!errors.cardNumber)} pl-9`}
                    {...register('cardNumber')}
                  />
                </div>
                <FieldError message={errors.cardNumber?.message} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expiry" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {translate('checkout.expiry')}
                  </label>
                  <input
                    id="expiry"
                    placeholder="12/27"
                    maxLength={5}
                    className={inputCls(!!errors.expiry)}
                    {...register('expiry')}
                  />
                  <FieldError message={errors.expiry?.message} />
                </div>

                <div>
                  <label htmlFor="cvv" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {translate('checkout.cvv')}
                  </label>
                  <input
                    id="cvv"
                    placeholder="123"
                    maxLength={4}
                    className={inputCls(!!errors.cvv)}
                    {...register('cvv')}
                  />
                  <FieldError message={errors.cvv?.message} />
                </div>
              </div>
            </div>
          </section>

          {/* Payment declined error banner */}
          {paymentError && (
            <div role="alert" className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-500" />
              {paymentError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isSubmitting ? translate('checkout.processing') : `Pay $${(totalPrice * 1.1).toFixed(2)}`}
          </button>

          {user && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              Ordering as <span className="font-medium text-gray-600 dark:text-gray-300">{user.email}</span>
            </p>
          )}
        </form>

        {/* ── Order summary ─────────────────────────────────────────────────── */}
        <aside className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 sticky top-20">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              {translate('checkout.order')} ({totalItems})
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
                    <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">{product.name}</p>
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
                <span>{translate('checkout.subtotal')}</span><span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>{translate('checkout.shipping')}</span><span className="text-green-600">{translate('checkout.free')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>{translate('checkout.tax')}</span><span>${(totalPrice * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-700 pt-2">
                <span>{translate('checkout.total')}</span><span>${(totalPrice * 1.1).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
