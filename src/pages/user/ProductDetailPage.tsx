/**
 * @fileoverview User Product Detail Page.
 *
 * Displays full product information — main image, gallery thumbnails,
 * description, price, stock badge, category, and an "Add to cart" CTA with
 * a quantity selector.
 *
 * ## SEO routing integration
 *
 * This page is mounted at `/products/:slugId` where `slugId` is a combined
 * human-readable slug and MongoDB ObjectId:
 *   `nike-air-max-270-64c8f1234567890123456789`
 *
 * The `extractProductId()` utility from `utils/slug.ts` strips the 24-char
 * hex ObjectId from the tail. Legacy pure-ID URLs still work via the fallback
 * path in that function.
 *
 * ## Wishlist button
 *
 * The heart icon toggle uses `useWishlistStore` for **guest** users (local
 * localStorage). For authenticated users this call should additionally hit the
 * server via `toggleWishlistItem()` from `wishlist.api.ts`. The current
 * implementation writes to the local store for all users — the server sync
 * occurs at login time via `useWishlistSync`. A production upgrade would also
 * call the toggle API for already-authenticated users.
 *
 * ## Lazy image gallery
 *
 * The main image is displayed prominently; clicking a thumbnail swaps it.
 * All images use `loading="lazy"` to defer network requests.
 *
 * @module pages/user/ProductDetailPage
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  Star,
  Minus,
  Plus,
  Check,
  AlertCircle,
  Heart,
} from 'lucide-react';
import { getProductById } from '@/api/products.api';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractProductId } from '@/utils/slug';
import { useI18n } from '@/i18n/use-i18n.hook';
import type { Product } from '@/types/product.types';

/**
 * Full product detail page with image gallery, quantity selector, wishlist
 * toggle, and cart CTA.
 */
export default function ProductDetailPage() {
  // The route param is :slugId (e.g. "nike-air-max-64c8f1234567890123456789").
  // extractProductId() returns the 24-char ObjectId from the tail.
  const { slugId } = useParams<{ slugId: string }>();
  const productId = slugId ? extractProductId(slugId) : undefined;

  const navigate = useNavigate();
  const { translate } = useI18n();
  const addItem = useCartStore((s) => s.addItem);
  const { hasItem, toggleItem } = useWishlistStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    getProductById(productId)
      .then((res) => {
        setProduct(res.data);
        setActiveImage(res.data.mainImage?.url ?? null);
      })
      .catch(() => setError('Could not load this product. Please go back and try again.'))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return;
    addItem(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-6 w-24 mb-6" />
        <div className="grid md:grid-cols-2 gap-10">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {error ?? 'Product not found.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {translate('product.backToProducts')}
        </button>
      </div>
    );
  }

  const allImages = [
    ...(product.mainImage?.url ? [product.mainImage.url] : []),
    ...product.subImages.map((img) => img.url),
  ];

  const isOutOfStock = product.stock === 0;
  const maxQty = Math.min(product.stock, 10);
  const wishlisted = hasItem(product._id);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" />
          {translate('nav.products')}
        </button>
        <span>/</span>
        {product.category?.name && (
          <>
            <span className="text-gray-400">{product.category.name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-white font-medium line-clamp-1">
          {product.name}
        </span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Image gallery */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-sm">
                {translate('product.noImage')}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  aria-label={`View image ${i + 1}`}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImage === url
                      ? 'border-indigo-600'
                      : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          {/* Category + wishlist row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              {product.category?.name && (
                <span className="inline-block text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                  {product.category.name}
                </span>
              )}
            </div>

            {/*
             * Wishlist toggle button.
             * For guest users: writes to localStorage via useWishlistStore.
             * For authenticated users: additionally call toggleWishlistItem()
             * from wishlist.api.ts (future enhancement — see module JSDoc).
             * The heart icon fills/empties reactively via hasItem().
             */}
            <button
              type="button"
              onClick={() => toggleItem(product._id)}
              aria-label={wishlisted ? translate('product.removeWishlist') : translate('product.wishlist')}
              aria-pressed={wishlisted}
              className={`p-2 rounded-xl border transition-colors ${
                wishlisted
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-500'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-200 dark:hover:border-red-800'
              }`}
            >
              <Heart size={18} className={wishlisted ? 'fill-red-500' : ''} />
            </button>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {product.name}
          </h1>

          {/* Mock rating */}
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={15}
                className={i < 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
              />
            ))}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">4.0 (124 {translate('product.reviews')})</span>
          </div>

          {/* Price */}
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">
            ${product.price.toFixed(2)}
          </p>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Stock badge */}
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium mb-6">
              <AlertCircle size={14} />
              {translate('product.outOfStock')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium mb-6">
              <Check size={14} />
              {translate('product.inStock')} ({product.stock} {translate('product.available')})
            </span>
          )}

          {/* Quantity selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {translate('product.qty')}
              </span>
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white border-x border-gray-300 dark:border-gray-600">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  aria-label="Increase quantity"
                  className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || addedToCart}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                addedToCart
                  ? 'bg-green-600 text-white'
                  : isOutOfStock
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {addedToCart ? (
                <>
                  <Check size={16} />
                  {translate('product.addedToCart')}
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  {isOutOfStock ? translate('product.outOfStock') : translate('product.addToCart')}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isOutOfStock) handleAddToCart();
                navigate('/cart');
              }}
              disabled={isOutOfStock}
              className="px-6 py-3 rounded-xl font-semibold text-sm border border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {translate('product.buyNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
