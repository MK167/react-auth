/**
 * @fileoverview User Wishlist Page.
 *
 * Displays all products the user has saved to their wishlist. Since the
 * wishlist store saves only productIds (to avoid stale price/stock data),
 * this page fetches the full product details in parallel on mount.
 *
 * ## Guest vs authenticated behaviour
 *
 * - **Guest**: wishlist lives in localStorage via `useWishlistStore`.
 * - **Authenticated**: after login `useWishlistSync` transfers items to the
 *   server. This page reads from the local store which is cleared on sync,
 *   so it effectively shows local-only items for guests and items added
 *   before/during the current session for logged-in users.
 *
 * ## Stale ID handling
 *
 * If a product fetch fails (404 — product deleted, or old ID format in
 * localStorage), the item is rendered as an "unavailable" placeholder card
 * with a remove button so the user can clean up their wishlist.
 *
 * @module pages/user/WishlistPage
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, AlertCircle, PackageX } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';
import { getProductById } from '@/api/products.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { toProductSlugId } from '@/utils/slug';
import { useI18n } from '@/i18n/i18n.context';
import type { Product } from '@/types/product.types';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { translate } = useI18n();
  const { items, removeItem } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addItem);

  const [products, setProducts] = useState<Product[]>([]);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Fetch full product details for every wishlisted ID in parallel.
  // Track both successful fetches and failures (stale/deleted products).
  useEffect(() => {
    if (items.length === 0) {
      setLoading(false);
      setProducts([]);
      setUnavailableIds([]);
      return;
    }

    setLoading(true);
    Promise.allSettled(items.map((item) => getProductById(item.productId)))
      .then((results) => {
        const fetched: Product[] = [];
        const failed: string[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            fetched.push(r.value.data);
          } else {
            failed.push(items[i].productId);
          }
        });
        setProducts(fetched);
        setUnavailableIds(failed);
      })
      .finally(() => setLoading(false));
  }, [items]);

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return;
    addToCart(product, 1);
    setAddedIds((prev) => new Set(prev).add(product._id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }, 2000);
  };

  const itemLabel = items.length === 1 ? translate('orders.item') : translate('orders.items');

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Heart size={52} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {translate('wishlist.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {translate('wishlist.emptySubtitle')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {translate('wishlist.browseProducts')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Heart size={22} className="text-rose-500 fill-rose-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {translate('wishlist.title')}
        </h1>
        {!loading && (
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {items.length} {itemLabel}
          </span>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product grid */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Available products */}
          {products.map((product) => {
            const isOutOfStock = product.stock === 0;
            const isAdded = addedIds.has(product._id);

            return (
              <div
                key={product._id}
                className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div
                  className="relative aspect-square bg-gray-50 dark:bg-gray-700 cursor-pointer overflow-hidden"
                  onClick={() =>
                    navigate(`/products/${toProductSlugId(product.name, product._id)}`)
                  }
                >
                  {product.mainImage?.url ? (
                    <img
                      src={product.mainImage.url}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AlertCircle size={24} className="text-gray-300 dark:text-gray-600" />
                    </div>
                  )}

                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-lg">
                        {translate('product.outOfStock')}
                      </span>
                    </div>
                  )}

                  {/* Remove button — appears on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(product._id);
                    }}
                    aria-label={translate('product.removeWishlist')}
                    className="absolute top-2 end-2 p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/90 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  {product.category?.name && (
                    <p className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-1">
                      {product.category.name}
                    </p>
                  )}
                  <p
                    className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-1"
                    onClick={() =>
                      navigate(`/products/${toProductSlugId(product.name, product._id)}`)
                    }
                  >
                    {product.name}
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                    ${product.price.toFixed(2)}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={isOutOfStock || isAdded}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isAdded
                        ? 'bg-green-600 text-white'
                        : isOutOfStock
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <ShoppingCart size={13} />
                    {isAdded
                      ? translate('product.addedToCart')
                      : isOutOfStock
                      ? translate('product.outOfStock')
                      : translate('product.addToCart')}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Unavailable / stale product placeholders */}
          {unavailableIds.map((productId) => (
            <div
              key={productId}
              className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center min-h-[220px]"
            >
              <PackageX size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug">
                {translate('wishlist.unavailable', 'Product no longer available')}
              </p>
              <button
                type="button"
                onClick={() => removeItem(productId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-rose-200 dark:border-rose-800 transition-colors"
              >
                <Trash2 size={12} />
                {translate('common.remove')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
